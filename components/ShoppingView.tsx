import React, { useState, useRef } from 'react';
import { Trip, ShoppingItem, VatStatus } from '../types';
import { ShoppingBag, FileText, Camera, Plus, Trash2, CheckCircle2, AlertCircle, Stamp, ArrowLeft, DollarSign, Image as ImageIcon, X, Loader2, Sparkles, UploadCloud, Search, List, Receipt } from 'lucide-react';
import { getAI, AI_MODEL, generateWithFallback } from '../services/aiService';

interface ShoppingViewProps {
    trip: Trip;
    onUpdateTrip: (t: Trip) => void;
}

const VAT_STATUS_LABELS: Record<VatStatus, { label: string, color: string, icon: any }> = {
    'NEED_FORM': { label: 'חסר טופס', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
    'HAVE_FORM': { label: 'יש טופס', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
    'STAMPED_AT_CUSTOMS': { label: 'חותמת מכס', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Stamp },
    'REFUNDED': { label: 'התקבל החזר', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
};

export const ShoppingView: React.FC<ShoppingViewProps> = ({ trip, onUpdateTrip }) => {
    const [viewMode, setViewMode] = useState<'list' | 'vat'>('list');
    const [items, setItems] = useState<ShoppingItem[]>(trip.shoppingItems || []);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newItem, setNewItem] = useState<Partial<ShoppingItem>>({
        currency: trip.currency || 'THB',
        isVatEligible: false,
        vatStatus: 'NEED_FORM'
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate Stats
    const totalSpent = items.reduce((sum, item) => sum + item.price, 0);
    const potentialRefund = items.filter(i => i.isVatEligible).reduce((sum, item) => sum + (item.refundAmountEstimated || (item.price * 0.05)), 0);
    const pendingForms = items.filter(i => i.isVatEligible && i.vatStatus === 'NEED_FORM').length;

    // Filter Items based on mode
    const displayedItems = viewMode === 'vat'
        ? items.filter(i => i.isVatEligible)
        : items;

    const handleSaveItem = () => {
        if (!newItem.name || !newItem.price) return;
        const item: ShoppingItem = {
            id: newItem.id || `shop-${Date.now()}`,
            name: newItem.name,
            shopName: newItem.shopName || '',
            price: Number(newItem.price),
            currency: newItem.currency || 'THB',
            purchaseDate: newItem.purchaseDate || new Date().toISOString().split('T')[0],
            isVatEligible: newItem.isVatEligible || false,
            vatStatus: newItem.vatStatus,
            receiptImageUrl: newItem.receiptImageUrl,
            productImageUrl: newItem.productImageUrl,
            refundAmountEstimated: newItem.refundAmountEstimated
        };

        const updatedItems = newItem.id
            ? items.map(i => i.id === newItem.id ? item : i)
            : [item, ...items];

        setItems(updatedItems);
        onUpdateTrip({ ...trip, shoppingItems: updatedItems });
        setIsFormOpen(false);
        setNewItem({ currency: trip.currency || 'THB', isVatEligible: false, vatStatus: 'NEED_FORM' });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('למחוק פריט זה?')) {
            const updatedItems = items.filter(i => i.id !== id);
            setItems(updatedItems);
            onUpdateTrip({ ...trip, shoppingItems: updatedItems });
        }
    };

    const updateStatus = (id: string, status: VatStatus) => {
        const updatedItems = items.map(i => i.id === id ? { ...i, vatStatus: status } : i);
        setItems(updatedItems);
        onUpdateTrip({ ...trip, shoppingItems: updatedItems });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'receiptImageUrl' | 'productImageUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewItem(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyzeReceipt = async (file: File) => {
        setIsAnalyzing(true);
        setIsFormOpen(true);

        try {
            const ai = getAI();
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];

                const prompt = `Analyze this shopping receipt image. 
                Extract: 
                1. Store Name (shopName)
                2. Total Price (numeric)
                3. Currency (e.g. THB, USD)
                4. Date (YYYY-MM-DD)
                5. Main Item Name (or "Shopping Haul")
                6. Is this likely eligible for VAT Refund? (boolean) - usually if over a certain amount or marked TAX FREE.
                7. Estimated Refund Amount (approx 5-7% if eligible).
                
                Return JSON: { name, shopName, price, currency, purchaseDate, isVatEligible, refundAmountEstimated }`;

                const response = await generateWithFallback(
                    ai,
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: file.type, data: base64Data } }
                        ]
                    },
                    { responseMimeType: 'application/json' }
                );

                const textContent = typeof response.text === 'function' ? response.text() : response.text;

                let data;
                try {
                    data = JSON.parse(textContent);
                } catch (e) {
                    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        data = JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error('Could not extract JSON from response');
                    }
                }
                setNewItem(prev => ({
                    ...prev,
                    ...data,
                    receiptImageUrl: reader.result as string,
                    vatStatus: data.isVatEligible ? 'NEED_FORM' : undefined
                }));
                setIsAnalyzing(false);
            };
            reader.readAsDataURL(file);

        } catch (e) {
            console.error("Receipt analysis failed", e);
            alert("לא הצלחנו לפענח את הקבלה, נסה להזין ידנית.");
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">

            {/* Top Toggle Switcher */}
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex mb-4">
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <ShoppingBag className="w-4 h-4" /> מה קנינו?
                </button>
                <button
                    onClick={() => setViewMode('vat')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${viewMode === 'vat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Receipt className="w-4 h-4" /> החזר מס (VAT)
                </button>
            </div>

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <span className={`p-2 rounded-xl ${viewMode === 'vat' ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'}`}>
                            {viewMode === 'vat' ? <Receipt className="w-8 h-8" /> : <ShoppingBag className="w-8 h-8" />}
                        </span>
                        {viewMode === 'vat' ? 'ניהול החזרי מס' : 'הקניות שלי'}
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">
                        {viewMode === 'vat' ? 'מעקב אחר טפסים וקבלת החזר בשדה' : 'תיעוד כל הבזבוזים והקבלות'}
                    </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-gradient-to-r from-pink-600 to-rose-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-200 hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5" /> סריקה חכמה (AI)
                    </button>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && handleAnalyzeReceipt(e.target.files[0])} />

                    <button onClick={() => setIsFormOpen(true)} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
                        <Plus className="w-5 h-5" /> ידני
                    </button>
                </div>
            </div>

            {/* Dynamic Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewMode === 'list' && (
                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden md:col-span-2">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">סה"כ בוזבז</span>
                                <div className="text-4xl font-black mt-2">{totalSpent.toLocaleString()} <span className="text-xl text-slate-400">{trip.currency === 'USD' ? '$' : '฿'}</span></div>
                            </div>
                            <div className="bg-white/10 p-3 rounded-2xl"><ShoppingBag className="w-8 h-8 text-white" /></div>
                        </div>
                    </div>
                )}

                {viewMode === 'vat' && (
                    <>
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest">צפי החזר מס</span>
                                    <div className="text-4xl font-black mt-2">{Math.floor(potentialRefund).toLocaleString()} <span className="text-xl text-indigo-200">{trip.currency === 'USD' ? '$' : '฿'}</span></div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-2xl"><DollarSign className="w-8 h-8 text-white" /></div>
                            </div>
                        </div>
                        <div className={`p-6 rounded-[2rem] shadow-lg border relative overflow-hidden ${pendingForms > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="relative z-10 flex justify-between items-center h-full">
                                <div>
                                    <span className={`text-xs font-bold uppercase tracking-widest ${pendingForms > 0 ? 'text-orange-600' : 'text-green-600'}`}>סטטוס טפסים</span>
                                    <div className={`text-2xl font-black mt-2 ${pendingForms > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                                        {pendingForms > 0 ? `חסרים ${pendingForms} טפסים` : 'הכל מוכן להחזר!'}
                                    </div>
                                    {pendingForms > 0 && <p className="text-xs text-orange-700 mt-1 font-medium">בקש "Tax Free Form" בחנות</p>}
                                </div>
                                <div className={`p-3 rounded-2xl ${pendingForms > 0 ? 'bg-orange-200' : 'bg-green-200'}`}>
                                    {pendingForms > 0 ? <AlertCircle className="w-8 h-8 text-orange-700" /> : <CheckCircle2 className="w-8 h-8 text-green-700" />}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Warning Banner (Only for VAT mode) */}
            {viewMode === 'vat' && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full"><Stamp className="w-5 h-5 text-indigo-600" /></div>
                    <div>
                        <h4 className="font-bold text-indigo-900 text-sm">איך מקבלים החזר מס?</h4>
                        <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                            1. בקשו טופס "VAT Refund" בחנות (הדרכון נדרש). <br />
                            2. בשדה התעופה, <b>לפני</b> שליחת המזוודות, גשו לעמדת המכס להחתמת הטפסים (הראו את המוצרים). <br />
                            3. אחרי הבידוק הביטחוני, גשו לעמדת ההחזר לקבלת הכסף.
                        </p>
                    </div>
                </div>
            )}

            {/* Items List */}
            <div className="space-y-4">
                {displayedItems.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            {viewMode === 'vat' ? <Receipt className="w-10 h-10 text-slate-300" /> : <ShoppingBag className="w-10 h-10 text-slate-300" />}
                        </div>
                        <h3 className="text-xl font-black text-slate-800">
                            {viewMode === 'vat' ? 'אין פריטים להחזר מס' : 'אין קניות עדיין'}
                        </h3>
                        <p className="text-slate-400 font-medium">
                            {viewMode === 'vat' ? 'הוסף קנייה וסמן אותה כזכאית ל-VAT' : 'העלה קבלה ראשונה והתחל לעקוב'}
                        </p>
                        <button onClick={() => fileInputRef.current?.click()} className="mt-6 text-pink-600 font-bold hover:underline">סרוק קבלה עכשיו</button>
                    </div>
                ) : (
                    [...displayedItems].reverse().map(item => (
                        <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center">
                            {/* Image */}
                            <div className="w-20 h-20 bg-slate-100 rounded-xl flex-shrink-0 overflow-hidden relative border border-slate-200 cursor-pointer group">
                                {item.productImageUrl ? (
                                    <img src={item.productImageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : item.receiptImageUrl ? (
                                    <img src={item.receiptImageUrl} alt="Receipt" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ShoppingBag className="w-8 h-8" /></div>
                                )}
                                {item.receiptImageUrl && <div className="absolute bottom-1 right-1 bg-white/90 p-1 rounded-md shadow-sm"><FileText className="w-3 h-3 text-blue-600" /></div>}
                            </div>

                            {/* Info */}
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between">
                                    <h3 className="font-bold text-slate-900 text-lg truncate">{item.name}</h3>
                                    <span className="font-black text-lg text-slate-800">{item.price.toLocaleString()} {item.currency}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <span>{item.shopName}</span>
                                    <span>•</span>
                                    <span>{item.purchaseDate}</span>
                                </div>

                                {/* VAT Status Bar */}
                                {item.isVatEligible ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <div onClick={() => {
                                            const flow: VatStatus[] = ['NEED_FORM', 'HAVE_FORM', 'STAMPED_AT_CUSTOMS', 'REFUNDED'];
                                            const next = flow[(flow.indexOf(item.vatStatus || 'NEED_FORM') + 1) % flow.length];
                                            updateStatus(item.id, next);
                                        }}
                                            className={`cursor-pointer px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${VAT_STATUS_LABELS[item.vatStatus || 'NEED_FORM'].color} hover:opacity-80`}>
                                            {React.createElement(VAT_STATUS_LABELS[item.vatStatus || 'NEED_FORM'].icon, { className: 'w-3.5 h-3.5' })}
                                            {VAT_STATUS_LABELS[item.vatStatus || 'NEED_FORM'].label}
                                        </div>
                                        {item.refundAmountEstimated && <span className="text-xs font-bold text-green-600">החזר משוער: {Math.floor(item.refundAmountEstimated)} {item.currency}</span>}
                                    </div>
                                ) : (
                                    viewMode === 'vat' && <div className="mt-2 text-xs text-slate-400 font-medium">לא זכאי להחזר מס</div>
                                )}
                            </div>

                            {/* Actions */}
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors self-end md:self-center">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Edit/Add Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
                    <div className="bg-white w-full md:max-w-md rounded-t-[2rem] md:rounded-[2rem] p-6 max-h-[90vh] overflow-y-auto relative">
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center rounded-[2rem]">
                                <Loader2 className="w-12 h-12 text-pink-600 animate-spin mb-4" />
                                <p className="text-lg font-bold text-slate-800 animate-pulse">ה-AI מנתח את הקבלה...</p>
                                <p className="text-sm text-slate-500">מחלץ חנות, מחיר ותאריך</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">פרטי קנייה</h3>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">שם המוצר / תיאור</label>
                                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-pink-500" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="למשל: בגדים ב-Zara" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 block mb-1">מחיר</label>
                                    <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-pink-500" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 block mb-1">מטבע</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" value={newItem.currency} onChange={e => setNewItem({ ...newItem, currency: e.target.value })}>
                                        <option value="THB">THB (฿)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="ILS">ILS (₪)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">חנות</label>
                                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none" value={newItem.shopName || ''} onChange={e => setNewItem({ ...newItem, shopName: e.target.value })} />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={newItem.isVatEligible} onChange={e => setNewItem({ ...newItem, isVatEligible: e.target.checked })} />
                                    <span className="font-bold text-blue-900 text-sm">זכאי להחזר מס (Tax Free)?</span>
                                </label>
                            </div>

                            {/* Images */}
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <label className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer ${newItem.receiptImageUrl ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}>
                                    {newItem.receiptImageUrl ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <FileText className="w-6 h-6 text-slate-400" />}
                                    <span className="text-[10px] font-bold text-slate-500 mt-1">קבלה</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'receiptImageUrl')} />
                                </label>
                                <label className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer ${newItem.productImageUrl ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}>
                                    {newItem.productImageUrl ? <div className="w-8 h-8 rounded overflow-hidden"><img src={newItem.productImageUrl} className="w-full h-full object-cover" /></div> : <Camera className="w-6 h-6 text-slate-400" />}
                                    <span className="text-[10px] font-bold text-slate-500 mt-1">צילום מוצר</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'productImageUrl')} />
                                </label>
                            </div>

                            <button onClick={handleSaveItem} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl mt-2">
                                שמור שינויים
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};