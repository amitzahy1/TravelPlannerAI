import React, { useState, useRef } from 'react';
import { Trip, ShoppingItem, VatStatus } from '../types';
import { ShoppingBag, FileText, Camera, Plus, Trash2, CheckCircle2, AlertCircle, Stamp, ArrowLeft, DollarSign, Image as ImageIcon, X } from 'lucide-react';

interface ShoppingTrackerProps {
  trip: Trip;
  onUpdateTrip: (t: Trip) => void;
  onClose: () => void;
}

const VAT_STATUS_LABELS: Record<VatStatus, { label: string, color: string, icon: any }> = {
    'NEED_FORM': { label: 'חסר טופס', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
    'HAVE_FORM': { label: 'יש טופס', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
    'STAMPED_AT_CUSTOMS': { label: 'חותמת מכס', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Stamp },
    'REFUNDED': { label: 'התקבל החזר', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
};

export const ShoppingTracker: React.FC<ShoppingTrackerProps> = ({ trip, onUpdateTrip, onClose }) => {
    const [items, setItems] = useState<ShoppingItem[]>(trip.shoppingItems || []);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newItem, setNewItem] = useState<Partial<ShoppingItem>>({ 
        currency: trip.currency || 'THB', 
        isVatEligible: false,
        vatStatus: 'NEED_FORM'
    });
    
    // Calculate Stats
    const totalSpent = items.reduce((sum, item) => sum + item.price, 0);
    const potentialRefund = items.filter(i => i.isVatEligible).reduce((sum, item) => sum + (item.refundAmountEstimated || (item.price * 0.05)), 0);
    const pendingForms = items.filter(i => i.isVatEligible && i.vatStatus === 'NEED_FORM').length;

    const handleSaveItem = () => {
        if (!newItem.name || !newItem.price) return;
        const item: ShoppingItem = {
            id: `shop-${Date.now()}`,
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
        const updatedItems = [...items, item];
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

    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="bg-white px-4 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-pink-500" />
                            מעקב קניות ו-VAT
                        </h2>
                    </div>
                </div>
                <button onClick={() => setIsFormOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg">
                    <Plus className="w-4 h-4" /> הוסף קנייה
                </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 pb-20 max-w-3xl mx-auto w-full space-y-6">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-5 -mt-5 blur-xl"></div>
                        <div className="relative z-10">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">סה"כ קניות</span>
                            <div className="text-3xl font-black mt-1">{totalSpent.toLocaleString()} <span className="text-lg">{trip.currency === 'USD' ? '$' : '฿'}</span></div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-20 h-20 bg-white/20 rounded-full -ml-5 -mt-5 blur-xl"></div>
                        <div className="relative z-10">
                            <span className="text-green-100 text-xs font-bold uppercase tracking-wider">החזר מס משוער</span>
                            <div className="text-3xl font-black mt-1">{Math.floor(potentialRefund).toLocaleString()} <span className="text-lg">{trip.currency === 'USD' ? '$' : '฿'}</span></div>
                        </div>
                    </div>
                </div>

                {pendingForms > 0 && (
                     <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-3">
                         <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                         <div>
                             <h4 className="font-bold text-orange-800 text-sm">שים לב! חסרים טפסים</h4>
                             <p className="text-xs text-orange-700 mt-1">יש לך {pendingForms} פריטים הזכאים להחזר מס שעדיין לא סימנת שיש לך טופס עבורם. אל תשכח לבקש בחנות!</p>
                         </div>
                     </div>
                )}

                {/* Items List */}
                <div className="space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <ShoppingBag className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                            <p className="font-bold text-gray-400">טרם הוספת קניות</p>
                        </div>
                    ) : (
                        [...items].reverse().map(item => (
                            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 flex gap-4">
                                    {/* Image Thumb */}
                                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative border border-gray-200">
                                        {item.productImageUrl ? (
                                            <img src={item.productImageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag className="w-8 h-8" /></div>
                                        )}
                                        {item.receiptImageUrl && (
                                            <div className="absolute bottom-1 right-1 bg-white/90 p-1 rounded-md shadow-sm">
                                                <FileText className="w-3 h-3 text-blue-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.name}</h3>
                                                <p className="text-sm text-gray-500 font-medium">{item.shopName || 'חנות ללא שם'}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-lg">{item.price.toLocaleString()} {item.currency}</div>
                                                <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        {/* VAT Section */}
                                        {item.isVatEligible && (
                                            <div className="mt-3 flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">סטטוס החזר</span>
                                                    {item.vatStatus && (
                                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${VAT_STATUS_LABELS[item.vatStatus].color}`}>
                                                            {React.createElement(VAT_STATUS_LABELS[item.vatStatus].icon, { className: 'w-3 h-3' })}
                                                            {VAT_STATUS_LABELS[item.vatStatus].label}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Status Cycler for quick update */}
                                                <button 
                                                    onClick={() => {
                                                        const flow: VatStatus[] = ['NEED_FORM', 'HAVE_FORM', 'STAMPED_AT_CUSTOMS', 'REFUNDED'];
                                                        const currentIdx = flow.indexOf(item.vatStatus || 'NEED_FORM');
                                                        const nextStatus = flow[(currentIdx + 1) % flow.length];
                                                        updateStatus(item.id, nextStatus);
                                                    }}
                                                    className="text-blue-600 text-xs font-bold underline px-2"
                                                >
                                                    עדכן
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Warning Footer */}
            <div className="bg-yellow-50 p-3 text-center border-t border-yellow-100">
                <p className="text-xs font-bold text-yellow-800 flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    שים לב: חובה לשמור את הקבלה המקורית ואת טופס ה-Tax Free המקורי להצגה בשדה!
                </p>
            </div>

            {/* Add Item Modal Overlay */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-md rounded-t-[2rem] md:rounded-[2rem] p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-800">הוספת קנייה חדשה</h3>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">שם המוצר</label>
                                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:border-blue-500" placeholder="למשל: נעלי נייק" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1">מחיר</label>
                                    <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:border-blue-500" placeholder="0" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1">מטבע</label>
                                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none" value={newItem.currency} onChange={e => setNewItem({...newItem, currency: e.target.value})}>
                                        <option value="THB">THB (฿)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="ILS">ILS (₪)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">שם החנות</label>
                                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 outline-none" placeholder="שם החנות" value={newItem.shopName || ''} onChange={e => setNewItem({...newItem, shopName: e.target.value})} />
                            </div>

                            {/* VAT Toggle */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-12 h-7 rounded-full transition-colors relative ${newItem.isVatEligible ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                        <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform ${newItem.isVatEligible ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                    <span className="font-bold text-blue-900 text-sm">זכאי להחזר מס (Tax Free)?</span>
                                    <input type="checkbox" className="hidden" checked={newItem.isVatEligible} onChange={e => setNewItem({...newItem, isVatEligible: e.target.checked})} />
                                </label>
                                
                                {newItem.isVatEligible && (
                                    <div className="mt-3 pt-3 border-t border-blue-200/50">
                                        <div className="flex gap-2 mb-2">
                                            {Object.entries(VAT_STATUS_LABELS).map(([key, conf]) => (
                                                <button 
                                                    key={key}
                                                    onClick={() => setNewItem({...newItem, vatStatus: key as VatStatus})}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all flex flex-col items-center gap-1 ${newItem.vatStatus === key ? conf.color + ' ring-2 ring-offset-1 ring-blue-200' : 'bg-white border-blue-100 text-slate-500 opacity-70'}`}
                                                >
                                                    {React.createElement(conf.icon, { className: 'w-3 h-3' })}
                                                    {conf.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Image Uploads */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors h-24 ${newItem.receiptImageUrl ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                                    {newItem.receiptImageUrl ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <FileText className="w-8 h-8 text-gray-400" />}
                                    <span className="text-[10px] font-bold text-gray-500 mt-1">{newItem.receiptImageUrl ? 'קבלה עלתה' : 'צילום קבלה'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'receiptImageUrl')} />
                                </label>
                                
                                <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors h-24 ${newItem.productImageUrl ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                                    {newItem.productImageUrl ? <div className="w-10 h-10 rounded overflow-hidden"><img src={newItem.productImageUrl} className="w-full h-full object-cover" /></div> : <Camera className="w-8 h-8 text-gray-400" />}
                                    <span className="text-[10px] font-bold text-gray-500 mt-1">{newItem.productImageUrl ? 'מוצר עלה' : 'צילום מוצר'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'productImageUrl')} />
                                </label>
                            </div>

                            <button onClick={handleSaveItem} disabled={!newItem.name} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50">שמור קנייה</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};