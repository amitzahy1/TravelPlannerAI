import React, { useState, useMemo, useRef } from 'react';
import { Trip, ManualExpense, HotelBooking, Ticket } from '../types';
import { Wallet, TrendingUp, DollarSign, PieChart, ShoppingBag, Utensils, Hotel, Ticket as TicketIcon, Plane, Plus, Trash2, X, Save, Car, Bus, ArrowRight, ChevronRight, UploadCloud, Loader2, Sparkles } from 'lucide-react';
import { getAI, AI_MODEL, generateWithFallback } from '../services/aiService';

interface BudgetViewProps {
    trip: Trip;
    onUpdateTrip?: (t: Trip) => void;
}

// Helper to parse price strings
const parsePrice = (priceStr?: string): number => {
    if (!priceStr) return 0;
    const numbers = priceStr.match(/(\d[\d,.]*)/);
    if (numbers) {
        return parseFloat(numbers[0].replace(/,/g, ''));
    }
    return 0;
};

export const BudgetView: React.FC<BudgetViewProps> = ({ trip, onUpdateTrip }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<ManualExpense>>({ title: '', amount: 0, category: 'other' });
    const [selectedCategory, setSelectedCategory] = useState<'hotels' | 'flights' | null>(null);

    // Calculate Totals logic
    const budget = useMemo(() => {
        let totalHotels = 0;
        let totalFlights = trip.flights?.totalPrice || 0;
        let totalAttractions = 0;
        let totalFood = 0;
        let totalShopping = 0;
        let totalTransport = 0;
        let totalOther = 0;

        trip.hotels.forEach(h => { totalHotels += h.costNumeric || parsePrice(h.price); });
        trip.attractions.forEach(cat => { cat.attractions.forEach(a => { totalAttractions += a.costNumeric || parsePrice(a.price); }); });
        trip.restaurants.forEach(cat => { cat.restaurants.forEach(r => { totalFood += r.estimatedCost || 0; }); });

        // Add Shopping Items
        if (trip.shoppingItems) {
            trip.shoppingItems.forEach(item => {
                totalShopping += item.price;
            });
        }

        // Add manual expenses
        if (trip.expenses) {
            trip.expenses.forEach(e => {
                if (e.category === 'food') totalFood += Number(e.amount);
                else if (e.category === 'shopping') totalShopping += Number(e.amount);
                else if (e.category === 'transport') totalTransport += Number(e.amount);
                else totalOther += Number(e.amount);
            });
        }

        const total = totalHotels + totalFlights + totalAttractions + totalFood + totalShopping + totalTransport + totalOther;

        return {
            total,
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
    }, [trip]);

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

    const currencySymbol = trip.currency === 'USD' ? '$' : '฿';

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-2xl text-green-600">
                    <Wallet className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-800">ניהול תקציב</h2>
                    <p className="text-gray-500 font-medium text-sm">מרכז את כל ההוצאות במקום אחד</p>
                </div>
            </div>

            {/* Total Card */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                <div className="relative z-10 flex flex-col justify-between items-start gap-4">
                    <div>
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">סה"כ עלות הטיול</span>
                        <div className="text-4xl font-black mt-1 flex items-baseline gap-1">
                            {budget.total.toLocaleString()}
                            <span className="text-xl text-gray-400">{currencySymbol}</span>
                        </div>
                    </div>
                    {trip.budgetLimit && (
                        <div className="w-full">
                            <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                                <span>תקציב יעד</span>
                                <span>{trip.budgetLimit.toLocaleString()} {currencySymbol}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${budget.total > trip.budgetLimit ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min((budget.total / trip.budgetLimit) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {budget.breakdown.map(item => (
                    <div
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'hotels') setSelectedCategory('hotels');
                            if (item.id === 'flights') setSelectedCategory('flights');
                        }}
                        className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all relative overflow-hidden group ${item.isInteractive ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-2 rounded-xl text-white ${item.color} shadow-sm`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            {item.isInteractive && <div className="bg-slate-50 p-1 rounded-full text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><ChevronRight className="w-4 h-4" /></div>}
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-wide">{item.label}</div>
                            <div className="text-xl font-black text-gray-800">{item.amount.toLocaleString()}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Manual Expenses Section */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-500" /> הוצאות כלליות</h3>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors">
                        {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                </div>

                {showAddForm && (
                    <div className="p-5 bg-blue-50 border-b border-blue-100 animate-fade-in">
                        <div className="space-y-3">
                            <input
                                placeholder="שם ההוצאה (למשל: מונית לשדה)"
                                className="w-full p-3 rounded-xl border border-blue-200 focus:outline-none focus:border-blue-500 font-bold text-sm"
                                value={newExpense.title}
                                onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                            />
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    placeholder="סכום"
                                    className="w-1/2 p-3 rounded-xl border border-blue-200 focus:outline-none focus:border-blue-500 font-bold text-sm"
                                    value={newExpense.amount || ''}
                                    onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                                />
                                <select
                                    className="w-1/2 p-3 rounded-xl border border-blue-200 focus:outline-none focus:border-blue-500 font-bold text-sm bg-white"
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                                >
                                    <option value="transport">תחבורה/העברות</option>
                                    <option value="food">אוכל</option>
                                    <option value="shopping">קניות</option>
                                    <option value="other">אחר</option>
                                </select>
                            </div>
                            <button onClick={handleAddExpense} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-blue-700">שמור הוצאה</button>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-gray-100">
                    {trip.expenses && trip.expenses.length > 0 ? (
                        trip.expenses.map(exp => (
                            <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-100 p-2 rounded-full text-gray-500">
                                        {exp.category === 'food' ? <Utensils className="w-4 h-4" /> :
                                            exp.category === 'shopping' ? <ShoppingBag className="w-4 h-4" /> :
                                                exp.category === 'transport' ? <Car className="w-4 h-4" /> :
                                                    <Wallet className="w-4 h-4" />}
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm">{exp.title}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-gray-900">{exp.amount.toLocaleString()} {currencySymbol}</span>
                                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-sm">אין הוצאות ידניות עדיין</div>
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
            const ai = getAI();
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const prompt = `Extract the total price from this ${category} receipt/invoice. Return ONLY JSON: { "price": number }. Ignore currency symbols.`;
                const response = await generateWithFallback(
                    ai,
                    { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } }] },
                    { responseMimeType: 'application/json' }
                );
                const textContent = typeof response.text === 'function' ? response.text() : response.text;
                const data = JSON.parse(textContent);
                if (data.price) {
                    handlePriceUpdate(itemId, data.price);
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
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        {category === 'hotels' ? <Hotel className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
                        ניהול עלויות {category === 'hotels' ? 'מלונות' : 'טיסות'}
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {category === 'hotels' ? (
                        trip.hotels.map(hotel => (
                            <div key={hotel.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="font-bold text-gray-800 mb-2">{hotel.name}</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-grow relative">
                                        <span className="absolute left-3 top-3 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold outline-none focus:border-blue-500"
                                            value={hotel.costNumeric || parsePrice(hotel.price) || ''}
                                            onChange={e => handlePriceUpdate(hotel.id, parseFloat(e.target.value))}
                                            placeholder="מחיר"
                                        />
                                    </div>
                                    <input type="file" className="hidden" id={`file-${hotel.id}`} onChange={(e) => e.target.files && handleReceiptUpload(e.target.files[0], hotel.id)} />
                                    <label htmlFor={`file-${hotel.id}`} className="bg-blue-50 text-blue-600 p-2.5 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-100">
                                        {analyzingId === hotel.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                        <span className="text-xs font-bold hidden md:inline">סרוק קבלה</span>
                                    </label>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="font-bold text-gray-800 mb-2">כרטיס טיסה (סה"כ)</div>
                            <div className="flex items-center gap-3">
                                <div className="flex-grow relative">
                                    <span className="absolute left-3 top-3 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold outline-none focus:border-blue-500"
                                        value={trip.flights.totalPrice || ''}
                                        onChange={e => handlePriceUpdate('flight-main', parseFloat(e.target.value))}
                                        placeholder="מחיר כרטיס כולל"
                                    />
                                </div>
                                <input type="file" className="hidden" id="flight-receipt" onChange={(e) => e.target.files && handleReceiptUpload(e.target.files[0], 'flight-main')} />
                                <label htmlFor="flight-receipt" className="bg-blue-50 text-blue-600 p-2.5 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-100">
                                    {analyzingId === 'flight-main' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                    <span className="text-xs font-bold hidden md:inline">סרוק קבלה</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};