import React, { useState, useMemo, useRef } from 'react';
import { Trip, ManualExpense, HotelBooking, Ticket } from '../types';
import { Wallet, TrendingUp, DollarSign, PieChart as PieChartIcon, ShoppingBag, Utensils, Hotel, Ticket as TicketIcon, Plane, Plus, Trash2, X, Save, Car, Bus, ArrowRight, ChevronRight, UploadCloud, Loader2, Sparkles, AlertCircle, Banknote, LayoutGrid, Coins, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { generateWithFallback, analyzeReceipt } from '../services/aiService';

interface BudgetViewProps {
    trip: Trip;
    onUpdateTrip?: (t: Trip) => void;
}

// --- CURRENCY LOGIC ---
const EXCHANGE_RATES: Record<string, number> = {
    'ILS': 1,
    'USD': 3.6,
    'EUR': 3.9,
    'THB': 0.11
};

const CURRENCY_SYMBOLS: Record<string, string> = {
    'ILS': '₪',
    'USD': '$',
    'EUR': '€',
    'THB': '฿'
};

const convertCurrency = (amount: number, from: string = 'ILS', to: string = 'ILS'): number => {
    if (!amount) return 0;
    if (from === to) return amount;

    // Convert to ILS (Base) first
    const rateToILS = EXCHANGE_RATES[from] || 1;
    const amountInILS = amount * rateToILS;

    // Convert to Target
    const rateFromILS = 1 / (EXCHANGE_RATES[to] || 1);
    return amountInILS * rateFromILS;
};

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
    const [newExpense, setNewExpense] = useState<Partial<ManualExpense>>({ title: '', amount: 0, category: 'other', currency: 'ILS' });
    const [selectedCategory, setSelectedCategory] = useState<'hotels' | 'flights' | null>(null);

    // Active Display Currency
    const displayCurrency = trip.currency || 'ILS';
    const currencySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

    // Calculate Totals logic
    const budget = useMemo(() => {
        let totalHotels = 0;
        let totalFlights = convertCurrency(trip.flights?.totalPrice || 0, trip.flights?.currency || 'USD', displayCurrency);
        let totalAttractions = 0;
        let totalFood = 0;
        let totalShopping = 0;
        let totalTransport = 0;
        let totalOther = 0;

        // Sum Hotels
        trip.hotels.forEach(h => {
            const rawCost = h.costNumeric || parsePrice(h.price);
            totalHotels += convertCurrency(rawCost, h.currency || 'USD', displayCurrency);
        });

        // Sum Attractions
        // Assumption: AI extracted prices are usually in local currency or USD. defaulting to USD if unknown for now.
        trip.attractions.forEach(cat => {
            cat.attractions.forEach(a => {
                const cost = a.costNumeric || parsePrice(a.price);
                totalAttractions += convertCurrency(cost, 'USD', displayCurrency);
            });
        });

        // Sum Food
        trip.restaurants.forEach(cat => {
            cat.restaurants.forEach(r => {
                totalFood += convertCurrency(r.estimatedCost || 0, 'USD', displayCurrency);
            });
        });

        // Sum Shopping
        if (trip.shoppingItems) {
            trip.shoppingItems.forEach(item => {
                totalShopping += convertCurrency(item.price, 'USD', displayCurrency);
            });
        }

        // Sum Manual Expenses
        if (trip.expenses) {
            trip.expenses.forEach(e => {
                const amount = convertCurrency(Number(e.amount), e.currency || 'ILS', displayCurrency);
                if (e.category === 'food') totalFood += amount;
                else if (e.category === 'shopping') totalShopping += amount;
                else if (e.category === 'transport') totalTransport += amount;
                else totalOther += amount;
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
    }, [trip, displayCurrency]);

    const handleAddExpense = () => {
        if (!newExpense.title || !newExpense.amount) return;
        if (!onUpdateTrip) return;

        const expense: ManualExpense = {
            id: `exp-${Date.now()}`,
            title: newExpense.title,
            amount: Number(newExpense.amount),
            currency: newExpense.currency || 'ILS',
            category: newExpense.category as any || 'other'
        };

        const updatedTrip = { ...trip, expenses: [...(trip.expenses || []), expense] };
        onUpdateTrip(updatedTrip);
        setNewExpense({ title: '', amount: 0, category: 'other', currency: 'ILS' });
        setShowAddForm(false);
    };

    const handleDeleteExpense = (id: string) => {
        if (!onUpdateTrip) return;
        const updatedTrip = { ...trip, expenses: (trip.expenses || []).filter(e => e.id !== id) };
        onUpdateTrip(updatedTrip);
    };

    return (
        <div className="animate-fade-in pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Wallet className="w-10 h-10 text-blue-600" />
                        ניהול תקציב
                    </h2>
                    <p className="text-slate-500 font-medium mt-2 text-lg max-w-lg">צפה בהוצאות בזמן אמת, המר מטבעות ונהל את כיס הטיול שלך בחכמה.</p>
                </div>

                {/* Currency Selector */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">הצג ב:</span>
                    {['ILS', 'USD', 'EUR', 'THB'].map(cur => (
                        <button
                            key={cur}
                            onClick={() => onUpdateTrip?.({ ...trip, currency: cur })}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${displayCurrency === cur
                                ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <span className="opacity-70">{CURRENCY_SYMBOLS[cur]}</span>
                            {cur}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hero Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Total Budget Card */}
                <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-60"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-50 rounded-full -ml-10 -mb-10 blur-3xl opacity-60"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">
                                    <Banknote className="w-4 h-4" /> סה"כ עלות משוערת
                                </span>
                                <div className="text-6xl md:text-7xl font-black tracking-tight text-slate-900 flex items-baseline gap-2 mt-2">
                                    {budget.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    <span className="text-3xl text-slate-400 font-medium">{currencySymbol}</span>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-3xl">
                                <Coins className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>

                        {trip.budgetLimit && (
                            <div className="mt-8">
                                <div className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                                    <span>נוצל: {Math.round((budget.total / trip.budgetLimit) * 100)}%</span>
                                    <span>תקרה: {convertCurrency(trip.budgetLimit, 'ILS', displayCurrency).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencySymbol}</span>
                                </div>
                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${budget.total > convertCurrency(trip.budgetLimit, 'ILS', displayCurrency) ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} transition-all duration-1000`}
                                        style={{ width: `${Math.min((budget.total / convertCurrency(trip.budgetLimit, 'ILS', displayCurrency)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                {budget.total > convertCurrency(trip.budgetLimit, 'ILS', displayCurrency) && (
                                    <div className="mt-3 flex items-center gap-2 text-red-500 font-bold text-sm animate-pulse">
                                        <AlertCircle className="w-4 h-4" />
                                        חריגה מהתקציב המוגדר!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart Card */}
                <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900"></div>
                    <div className="relative z-10 w-full h-64">
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
                                <RechartsTooltip
                                    formatter={(value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currencySymbol}`}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5)', fontWeight: 'bold', backgroundColor: '#1e293b', color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-2">
                            <div className="text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">חלוקה</div>
                                <div className="text-lg font-black text-white">{budget.chartData.length} קטגוריות</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown Grid */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-px bg-slate-200 flex-grow"></div>
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        פירוט לפי קטגוריות
                    </h3>
                    <div className="h-px bg-slate-200 flex-grow"></div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {budget.breakdown.map(item => (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'hotels') setSelectedCategory('hotels');
                                if (item.id === 'flights') setSelectedCategory('flights');
                            }}
                            className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden ${item.isInteractive ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3.5 rounded-2xl text-white ${item.color} shadow-lg shadow-${item.color.replace('bg-', '')}/20 group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                {item.isInteractive && (
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{item.label}</div>
                                <div className="text-2xl font-black text-slate-800 tracking-tight">{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm text-slate-400 font-normal">{currencySymbol}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Manual Expenses Section */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">הוצאות נוספות</h3>
                        <p className="text-slate-500 font-medium mt-1">הוסף הוצאות מזדמנות כמו מוניות, קניות או אוכל רחוב</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform active:scale-95 ${showAddForm ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showAddForm ? 'ביטול' : 'הוסף הוצאה'}
                    </button>
                </div>

                {showAddForm && (
                    <div className="p-8 bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5 space-y-1">
                                <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">תיאור</label>
                                <input
                                    placeholder="לדוגמא: מונית לשדה"
                                    className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 bg-white shadow-sm"
                                    value={newExpense.title}
                                    onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">מטבע</label>
                                <select
                                    className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 bg-white shadow-sm appearance-none"
                                    value={newExpense.currency}
                                    onChange={e => setNewExpense({ ...newExpense, currency: e.target.value })}
                                >
                                    {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">סכום</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-black text-slate-700 bg-white shadow-sm text-center"
                                    value={newExpense.amount || ''}
                                    onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="md:col-span-3 space-y-1">
                                <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">קטגוריה</label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 bg-white shadow-sm appearance-none"
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                                    >
                                        <option value="transport">תחבורה</option>
                                        <option value="food">אוכל</option>
                                        <option value="shopping">קניות</option>
                                        <option value="other">אחר</option>
                                    </select>
                                    <button onClick={handleAddExpense} className="w-16 h-[58px] bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center">
                                        <ArrowRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {trip.expenses && trip.expenses.length > 0 ? (
                        trip.expenses.map(exp => (
                            <div key={exp.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-5">
                                    <div className={`p-3.5 rounded-2xl ${exp.category === 'food' ? 'bg-orange-100 text-orange-600' :
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
                                        <div className="font-bold text-slate-800 text-lg">{exp.title}</div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-1 uppercase tracking-wide">
                                            <span>
                                                {exp.category === 'food' ? 'אוכל' :
                                                    exp.category === 'shopping' ? 'קניות' :
                                                        exp.category === 'transport' ? 'תחבורה' : 'כללי'}
                                            </span>
                                            <span>•</span>
                                            <span>{exp.amount} {CURRENCY_SYMBOLS[exp.currency || 'ILS']} (מקור)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-black text-slate-900 text-xl font-mono tracking-tight">
                                        {convertCurrency(exp.amount, exp.currency || 'ILS', displayCurrency).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencySymbol}
                                    </span>
                                    <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                <Sparkles className="w-8 h-8 text-slate-300" />
                            </div>
                            <h4 className="text-slate-800 font-bold text-lg">אין הוצאות נוספות</h4>
                            <p className="text-slate-400 font-medium max-w-xs mx-auto">כאן יופיעו הוצאות ידניות שתוסיף, כמו קניות בדיוטי פרי או מוניות.</p>
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
                    displayCurrency={displayCurrency}
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
    onUpdate: (t: Trip) => void,
    displayCurrency: string
}> = ({ category, trip, onClose, onUpdate, displayCurrency }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const currencySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

    const handlePriceUpdate = (id: string, newPrice: number, currency: string = 'ILS') => {
        if (category === 'hotels') {
            const updatedHotels = trip.hotels.map(h => h.id === id ? { ...h, costNumeric: newPrice, currency } : h);
            onUpdate({ ...trip, hotels: updatedHotels });
        } else {
            const updatedTicket = { ...trip.flights, totalPrice: newPrice, currency };
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

                // Assuming generic AI detection, defaulting to ILS if not detected for simplicity in this version
                // Ideally AI returns currency too.
                const price = data?.price || data?.totalPrice;
                if (price) {
                    handlePriceUpdate(itemId, price, 'ILS'); // Default to ILS for scanned receipts for now
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
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            {category === 'hotels' ? <Hotel className="w-8 h-8 text-indigo-500" /> : <Plane className="w-8 h-8 text-blue-500" />}
                            ניהול עלויות {category === 'hotels' ? 'מלונות' : 'טיסות'}
                        </h3>
                        <p className="text-slate-500 text-sm font-bold mt-1">עדכון עלויות במטבע המקור</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>

                <div className="p-8 overflow-y-auto space-y-4 bg-slate-50/50 flex-grow">
                    {category === 'hotels' ? (
                        trip.hotels.map(hotel => (
                            <div key={hotel.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-50 p-3 rounded-xl"><Hotel className="w-6 h-6 text-indigo-500" /></div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg">{hotel.name}</div>
                                        <div className="text-xs font-bold text-slate-400">{hotel.nights} לילות • {hotel.city || 'לא צוין עיר'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                    <div className="flex-grow space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">סכום במטבע מקור</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                value={hotel.costNumeric || parsePrice(hotel.price) || ''}
                                                onChange={e => handlePriceUpdate(hotel.id, parseFloat(e.target.value), hotel.currency || 'USD')}
                                                placeholder="0"
                                            />
                                            <select
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                                                value={hotel.currency || 'USD'}
                                                onChange={e => handlePriceUpdate(hotel.id, hotel.costNumeric || 0, e.target.value)}
                                            >
                                                {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="h-10 w-px bg-slate-200 mx-2"></div>

                                    <div className="text-center min-w-[80px]">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">שווי ב-{displayCurrency}</div>
                                        <div className="font-black text-indigo-600 text-lg">
                                            {convertCurrency(hotel.costNumeric || 0, hotel.currency || 'USD', displayCurrency).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            <span className="text-xs ml-1 text-slate-400">{currencySymbol}</span>
                                        </div>
                                    </div>

                                    <div className="h-10 w-px bg-slate-200 mx-2"></div>

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

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl justify-center max-w-md mx-auto">
                                <div className="flex-grow space-y-1 text-left">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">סכום במטבע מקור</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            value={trip.flights.totalPrice || ''}
                                            onChange={e => handlePriceUpdate('flight-main', parseFloat(e.target.value), trip.flights.currency || 'USD')}
                                            placeholder="0"
                                        />
                                        <select
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                                            value={trip.flights.currency || 'USD'}
                                            onChange={e => handlePriceUpdate('flight-main', trip.flights.totalPrice || 0, e.target.value)}
                                        >
                                            {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="h-10 w-px bg-slate-200 mx-2"></div>

                                <div className="text-center min-w-[80px]">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">שווי ב-{displayCurrency}</div>
                                    <div className="font-black text-blue-600 text-lg">
                                        {convertCurrency(trip.flights.totalPrice || 0, trip.flights.currency || 'USD', displayCurrency).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        <span className="text-xs ml-1 text-slate-400">{currencySymbol}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};