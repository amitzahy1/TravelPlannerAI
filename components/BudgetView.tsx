import React, { useState, useMemo, useRef } from 'react';
import { Trip, ManualExpense, HotelBooking, Ticket } from '../types';
import { Wallet, TrendingUp, DollarSign, PieChart as PieChartIcon, ShoppingBag, Utensils, Hotel, Ticket as TicketIcon, Plane, Plus, Trash2, X, Save, Car, Bus, ArrowRight, ChevronRight, UploadCloud, Loader2, Sparkles, AlertCircle, Banknote, LayoutGrid } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { generateWithFallback, analyzeReceipt } from '../services/aiService';

interface BudgetViewProps {
    trip: Trip;
    onUpdateTrip?: (t: Trip) => void;
}

// Ensure strict number parsing
const parsePrice = (priceStr?: string | number): number => {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    const numbers = String(priceStr).match(/(\d[\d,.]*)/);
    if (numbers) {
        return parseFloat(numbers[0].replace(/,/g, ''));
    }
    return 0;
};

export const BudgetView: React.FC<BudgetViewProps> = ({ trip, onUpdateTrip }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<ManualExpense>>({ title: '', amount: 0, category: 'other' });
    const [selectedCategory, setSelectedCategory] = useState<'hotels' | 'flights' | null>(null);

    // Default Currency Logic: If trip.currency missing -> Default to ILS
    const activeCurrency = trip.currency || 'ILS';
    const currencySymbol = activeCurrency === 'USD' ? '$' : activeCurrency === 'EUR' ? '€' : activeCurrency === 'THB' ? '฿' : '₪';

    // Calculate Totals logic
    const budget = useMemo(() => {
        let totalHotels = 0;
        let totalFlights = trip.flights?.totalPrice || 0;
        let totalAttractions = 0;
        let totalFood = 0;
        let totalShopping = 0;
        let totalTransport = 0;
        let totalOther = 0;

        // Sum Hotels
        trip.hotels.forEach(h => { totalHotels += h.costNumeric || parsePrice(h.price); });

        // Sum Attractions
        trip.attractions.forEach(cat => { cat.attractions.forEach(a => { totalAttractions += a.costNumeric || parsePrice(a.price); }); });

        // Sum Food
        trip.restaurants.forEach(cat => { cat.restaurants.forEach(r => { totalFood += r.estimatedCost || 0; }); });

        // Sum Shopping
        if (trip.shoppingItems) {
            trip.shoppingItems.forEach(item => {
                totalShopping += item.price;
            });
        }

        // Sum Manual Expenses
        if (trip.expenses) {
            trip.expenses.forEach(e => {
                if (e.category === 'food') totalFood += Number(e.amount);
                else if (e.category === 'shopping') totalShopping += Number(e.amount);
                else if (e.category === 'transport') totalTransport += Number(e.amount);
                else totalOther += Number(e.amount);
            });
        }

        const total = totalHotels + totalFlights + totalAttractions + totalFood + totalShopping + totalTransport + totalOther;

        const chartData = [
            { name: 'טיסות', value: totalFlights, color: '#3b82f6' },
            { name: 'מלונות', value: totalHotels, color: '#6366f1' },
            { name: 'אטרקציות', value: totalAttractions, color: '#a855f7' },
            { name: 'אוכל', value: totalFood, color: '#f97316' },
            { name: 'קניות', value: totalShopping, color: '#ec4899' },
            { name: 'תחבורה', value: totalTransport, color: '#10b981' },
            { name: 'אחר', value: totalOther, color: '#6b7280' },
        ].filter(i => i.value > 0);

        return {
            total,
            chartData,
            breakdown: [
                { id: 'flights', label: 'טיסות', amount: totalFlights, icon: Plane, color: 'bg-blue-500', isInteractive: true },
                { id: 'hotels', label: 'מלונות', amount: totalHotels, icon: Hotel, color: 'bg-indigo-500', isInteractive: true },
                { id: 'transport', label: 'העברות', amount: totalTransport, icon: Car, color: 'bg-emerald-500' },
                { id: 'attractions', label: 'אטרקציות', amount: totalAttractions, icon: TicketIcon, color: 'bg-purple-500' },
                { id: 'food', label: 'אוכל', amount: totalFood, icon: Utensils, color: 'bg-orange-500' },
                { id: 'shopping', label: 'קניות', amount: totalShopping, icon: ShoppingBag, color: 'bg-pink-500' },
                { id: 'other', label: 'אחר', amount: totalOther, icon: Wallet, color: 'bg-gray-500' },
            ]
        };
    }, [trip, activeCurrency]);

    const handleAddExpense = () => {
        if (!newExpense.title || !newExpense.amount) return;
        if (!onUpdateTrip) return;

        const expense: ManualExpense = {
            id: `exp-${Date.now()}`,
            title: newExpense.title,
            amount: Number(newExpense.amount),
            category: newExpense.category as any || 'other'
        };

        const updatedTrip = { ...trip, expenses: [...(trip.expenses || []), expense] };
        onUpdateTrip(updatedTrip);
        setNewExpense({ title: '', amount: 0, category: 'other' });
        setShowAddForm(false);
    };

    const handleDeleteExpense = (id: string) => {
        if (!onUpdateTrip) return;
        const updatedTrip = { ...trip, expenses: (trip.expenses || []).filter(e => e.id !== id) };
        onUpdateTrip(updatedTrip);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">ניהול תקציב</h2>
                    <p className="text-slate-500 font-medium mt-2 text-lg">מעקב אחר הוצאות הטיול בזמן אמת</p>
                </div>

                {/* Modern Currency Selector */}
                <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
                    {['ILS', 'USD', 'EUR', 'THB'].map(cur => (
                        <button
                            key={cur}
                            onClick={() => onUpdateTrip?.({ ...trip, currency: cur })}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeCurrency === cur
                                ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            {cur === 'ILS' && '₪'}
                            {cur === 'USD' && '$'}
                            {cur === 'EUR' && '€'}
                            {cur === 'THB' && '฿'}
                            {cur}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Total Budget Card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full -ml-20 -mb-20 blur-3xl"></div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">
                                    <Banknote className="w-4 h-4" /> סה"כ עלות הטיול
                                </span>
                                <div className="text-5xl md:text-6xl font-black tracking-tight flex items-baseline gap-2">
                                    {budget.total.toLocaleString()}
                                    <span className="text-2xl md:text-3xl text-slate-400 font-medium">{currencySymbol}</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                <PieChartIcon className="w-8 h-8 text-blue-400" />
                            </div>
                        </div>

                        {trip.budgetLimit && (
                            <div className="mt-8 space-y-3">
                                <div className="flex justify-between text-sm font-bold text-slate-300">
                                    <span>נוצל: {Math.round((budget.total / trip.budgetLimit) * 100)}%</span>
                                    <span>תקרה: {trip.budgetLimit.toLocaleString()} {currencySymbol}</span>
                                </div>
                                <div className="w-full h-4 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                                    <div
                                        className={`h-full ${budget.total > trip.budgetLimit ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'} transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]`}
                                        style={{ width: `${Math.min((budget.total / trip.budgetLimit) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                {budget.total > trip.budgetLimit && (
                                    <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 w-fit backdrop-blur-md animate-pulse">
                                        <AlertCircle className="w-4 h-4" /> חריגה מהתקציב!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart Card */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest absolute top-6 right-6">התפלגות הוצאות</h3>
                    <div className="w-full h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={budget.chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {budget.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `${value.toLocaleString()} ${currencySymbol}`}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Center Total */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-4">
                        <div className="text-center">
                            <div className="text-xs text-slate-400 font-bold">סה"כ</div>
                            <div className="text-xl font-black text-slate-800">{budget.total.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown Grid */}
            <div>
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-slate-400" />
                    פירוט לפי קטגוריות
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {budget.breakdown.map(item => (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'hotels') setSelectedCategory('hotels');
                                if (item.id === 'flights') setSelectedCategory('flights');
                            }}
                            className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group ${item.isInteractive ? 'cursor-pointer hover:border-blue-200' : ''}`}
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color.replace('bg-', 'from-')}/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl text-white ${item.color} shadow-lg shadow-${item.color.replace('bg-', '')}/30`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    {item.isInteractive && (
                                        <div className="bg-slate-50 p-1.5 rounded-full text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{item.label}</div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tight">{item.amount.toLocaleString()} <span className="text-sm text-slate-400 font-normal">{currencySymbol}</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Manual Expenses Section */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> הוצאות נוספות</h3>
                        <p className="text-slate-500 text-sm font-medium mt-1">הוסף הוצאות מזדמנות כמו מוניות, קניות או אוכל רחוב</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all ${showAddForm ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30'}`}
                    >
                        {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showAddForm ? 'ביטול' : 'הוסף הוצאה'}
                    </button>
                </div>

                {showAddForm && (
                    <div className="p-6 bg-blue-50/50 border-b border-blue-100 animate-in slide-in-from-top-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-grow space-y-1">
                                <label className="text-xs font-bold text-blue-800 mr-2">שם ההוצאה</label>
                                <input
                                    placeholder="לדוגמא: מונית לשדה"
                                    className="w-full p-4 rounded-2xl border border-blue-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 bg-white shadow-sm"
                                    value={newExpense.title}
                                    onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                                />
                            </div>
                            <div className="w-full md:w-48 space-y-1">
                                <label className="text-xs font-bold text-blue-800 mr-2">סכום ({currencySymbol})</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-4 rounded-2xl border border-blue-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-black text-slate-700 bg-white shadow-sm text-center"
                                    value={newExpense.amount || ''}
                                    onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="w-full md:w-56 space-y-1">
                                <label className="text-xs font-bold text-blue-800 mr-2">קטגוריה</label>
                                <select
                                    className="w-full p-4 rounded-2xl border border-blue-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 bg-white shadow-sm appearance-none cursor-pointer"
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                                >
                                    <option value="transport">תחבורה 🚕</option>
                                    <option value="food">אוכל 🍔</option>
                                    <option value="shopping">קניות 🛍️</option>
                                    <option value="other">אחר 📝</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={handleAddExpense} className="w-full md:w-auto h-[58px] px-8 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                    <Save className="w-5 h-5" /> שמור
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {trip.expenses && trip.expenses.length > 0 ? (
                        trip.expenses.map(exp => (
                            <div key={exp.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${exp.category === 'food' ? 'bg-orange-100 text-orange-600' :
                                            exp.category === 'shopping' ? 'bg-pink-100 text-pink-600' :
                                                exp.category === 'transport' ? 'bg-emerald-100 text-emerald-600' :
                                                    'bg-slate-100 text-slate-600'
                                        }`}>
                                        {exp.category === 'food' ? <Utensils className="w-5 h-5" /> :
                                            exp.category === 'shopping' ? <ShoppingBag className="w-5 h-5" /> :
                                                exp.category === 'transport' ? <Car className="w-5 h-5" /> :
                                                    <Wallet className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-base">{exp.title}</div>
                                        <div className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                                            {exp.category === 'food' ? 'אוכל' :
                                                exp.category === 'shopping' ? 'קניות' :
                                                    exp.category === 'transport' ? 'תחבורה' : 'כללי'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-black text-slate-900 text-lg md:text-xl font-mono tracking-tight">{exp.amount.toLocaleString()} {currencySymbol}</span>
                                    <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-slate-300" />
                            </div>
                            <div className="text-slate-400 font-medium">אין הוצאות ידניות עדיין.<br />כל ההוצאות שתוסיף כאן יצטרפו לחישוב התקציב הכללי.</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Category Modal */}
            {selectedCategory && onUpdateTrip && (
                <CategoryDetailModal
                    category={selectedCategory}
                    trip={trip}
                    onClose={() => setSelectedCategory(null)}
                    onUpdate={onUpdateTrip}
                />
            )}
        </div>
    );
};

// Sub-component for managing specific category costs (Flights/Hotels)
const CategoryDetailModal: React.FC<{
    category: 'hotels' | 'flights',
    trip: Trip,
    onClose: () => void,
    onUpdate: (t: Trip) => void
}> = ({ category, trip, onClose, onUpdate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);

    const handlePriceUpdate = (id: string, newPrice: number) => {
        if (category === 'hotels') {
            const updatedHotels = trip.hotels.map(h => h.id === id ? { ...h, costNumeric: newPrice } : h);
            onUpdate({ ...trip, hotels: updatedHotels });
        } else {
            // For flights we update the whole ticket total, but here we might need per segment logic or just main total
            const updatedTicket = { ...trip.flights, totalPrice: newPrice };
            onUpdate({ ...trip, flights: updatedTicket });
        }
    };

    const handleReceiptUpload = async (file: File, itemId: string) => {
        setAnalyzingId(itemId);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const response = await analyzeReceipt(base64Data, file.type, 'TOTAL');
                const textContent = response.text;
                let data;
                try {
                    data = JSON.parse(textContent);
                } catch (e) {
                    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) data = JSON.parse(jsonMatch[0]);
                }
                if (data && data.price) {
                    handlePriceUpdate(itemId, data.price);
                } else if (data && data.totalPrice) {
                    handlePriceUpdate(itemId, data.totalPrice);
                }
            };
            reader.readAsDataURL(file);
        } catch (e) {
            console.error(e);
            alert("לא הצלחנו לחלץ מחיר מהקבלה.");
        } finally {
            setAnalyzingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            {category === 'hotels' ? <Hotel className="w-8 h-8 text-indigo-500" /> : <Plane className="w-8 h-8 text-blue-500" />}
                            ניהול עלויות {category === 'hotels' ? 'מלונות' : 'טיסות'}
                        </h3>
                        <p className="text-slate-500 text-sm font-bold mt-1">עדכון ידני או סריקת קבלות</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>

                <div className="p-8 overflow-y-auto space-y-4 bg-slate-50/50 flex-grow">
                    {category === 'hotels' ? (
                        trip.hotels.map(hotel => (
                            <div key={hotel.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-50 p-3 rounded-xl"><Hotel className="w-6 h-6 text-indigo-500" /></div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg">{hotel.name}</div>
                                        <div className="text-xs font-bold text-slate-400">{hotel.nights} לילות • {hotel.city || 'לא צוין עיר'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-32">
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-center"
                                            value={hotel.costNumeric || parsePrice(hotel.price) || ''}
                                            onChange={e => handlePriceUpdate(hotel.id, parseFloat(e.target.value))}
                                            placeholder="0"
                                        />
                                    </div>
                                    <input type="file" className="hidden" id={`file-${hotel.id}`} onChange={(e) => e.target.files && handleReceiptUpload(e.target.files[0], hotel.id)} />
                                    <label htmlFor={`file-${hotel.id}`} className="bg-white border border-slate-200 text-slate-600 p-3 rounded-xl cursor-pointer hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm" title="סרוק קבלה">
                                        {analyzingId === hotel.id ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <UploadCloud className="w-5 h-5" />}
                                    </label>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plane className="w-8 h-8 text-blue-500" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-2">עלות כוללת לכל הטיסות</h4>
                            <p className="text-slate-500 mb-6 text-sm">הזן את העלות הכוללת של כל כרטיסי הטיסה בטיול</p>

                            <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
                                <input
                                    type="number"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-center"
                                    value={trip.flights.totalPrice || ''}
                                    onChange={e => handlePriceUpdate('flight-main', parseFloat(e.target.value))}
                                    placeholder="0"
                                />
                                <input type="file" className="hidden" id="flight-receipt" onChange={(e) => e.target.files && handleReceiptUpload(e.target.files[0], 'flight-main')} />
                                <label htmlFor="flight-receipt" className={`h-[68px] w-[68px] flex items-center justify-center bg-blue-600 text-white rounded-2xl cursor-pointer hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all ${analyzingId === 'flight-main' ? 'opacity-70 cursor-wait' : ''}`}>
                                    {analyzingId === 'flight-main' ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};