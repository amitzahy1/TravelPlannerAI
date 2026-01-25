import React, { useState } from 'react';
import { Trip } from '../types';
import { createSharedTrip } from '../services/firestoreService';
import { X, Link, Copy, Check, Users, Shield, Globe, Plus } from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface ShareModalProps {
        trip: Trip;
        onClose: () => void;
        onUpdateTrip: (t: Trip) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ trip, onClose, onUpdateTrip }) => {
        const [loading, setLoading] = useState(false);
        const [copied, setCopied] = useState(false);
        const [inviteEmail, setInviteEmail] = useState('');
        const [error, setError] = useState('');

        const auth = getAuth();
        const user = auth.currentUser;
        const isShared = trip.isShared && trip.sharing?.shareId;

        const shareUrl = isShared
                ? `${window.location.origin}/#/join/${trip.sharing?.shareId}`
                : '';

        const handleCreateShare = async () => {
                if (!user || !user.email) {
                        setError('עליך להיות מחובר עם אימייל תקין כדי לשתף טיול');
                        return;
                }

                setLoading(true);
                setError('');
                try {
                        const shareId = await createSharedTrip(user.uid, user.email, trip, inviteEmail || undefined);

                        // Update local trip state to reflect sharing immediately
                        const updatedTrip: Trip = {
                                ...trip,
                                isShared: true,
                                sharing: {
                                        owner: user.uid,
                                        collaborators: [user.uid],
                                        shareId: shareId,
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                        updatedBy: user.uid
                                }
                        };
                        onUpdateTrip(updatedTrip);
                } catch (e: any) {
                        console.error('Share error:', e);
                        setError('אירעה שגיאה ביצירת השיתוף. וודא שאתה מחובר ונסה שנית.');
                } finally {
                        setLoading(false);
                }
        };

        const handleCopy = () => {
                if (!shareUrl) return;
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
        };

        return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                                <button
                                        onClick={onClose}
                                        className="absolute top-4 left-4 p-2 bg-slate-100/50 hover:bg-slate-100 rounded-full text-slate-500 transition-all z-10"
                                >
                                        <X className="w-5 h-5" />
                                </button>

                                <div className="p-8 text-center">
                                        <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Users className="w-8 h-8 text-indigo-600" />
                                        </div>

                                        <h2 className="text-2xl font-black text-slate-900 mb-2">שתף טיול</h2>
                                        <p className="text-slate-500 mb-6 text-xs font-medium leading-relaxed">
                                                הזמן חברים לערוך את הטיול איתך. הכנס מייל להזמנה או צור לינק פתוח.
                                        </p>

                                        {error && (
                                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-xl border border-red-100">
                                                        {error}
                                                </div>
                                        )}

                                        {!isShared ? (
                                                <div className="space-y-4">
                                                        <div className="relative">
                                                                <input
                                                                        type="email"
                                                                        value={inviteEmail}
                                                                        onChange={(e) => setInviteEmail(e.target.value)}
                                                                        placeholder="מייל של חבר (אופציונלי)"
                                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all text-sm font-medium"
                                                                />
                                                        </div>
                                                        <button
                                                                onClick={handleCreateShare}
                                                                disabled={loading}
                                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                        >
                                                                {loading ? (
                                                                        <span className="animate-spin text-lg">⌛</span>
                                                                ) : (
                                                                        <>
                                                                                <Plus className="w-4 h-4" /> הזמן וצור לינק
                                                                        </>
                                                                )}
                                                        </button>
                                                </div>
                                        ) : (
                                                <div className="space-y-4 animate-fade-in">
                                                        <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-2xl flex items-center gap-2">
                                                                <div className="bg-white flex-grow p-3 rounded-xl text-left text-[10px] text-slate-400 font-mono truncate border border-slate-50 select-all">
                                                                        {shareUrl}
                                                                </div>
                                                                <button
                                                                        onClick={handleCopy}
                                                                        className={`p-3 rounded-xl font-bold transition-all flex items-center justify-center ${copied
                                                                                ? 'bg-green-500 text-white shadow-md'
                                                                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                                                                                }`}
                                                                >
                                                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                                                </button>
                                                        </div>

                                                        <div className="flex items-center justify-center gap-4 mt-6">
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                        <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100"><Shield className="w-4 h-4" /></div>
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">מאובטח</span>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                        <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 border border-indigo-100"><Globe className="w-4 h-4" /></div>
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">סנכרון בענן</span>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                        <div className="bg-orange-50 p-2 rounded-xl text-orange-600 border border-orange-100"><Users className="w-4 h-4" /></div>
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">עריכה משותפת</span>
                                                                </div>
                                                        </div>
                                                </div>
                                        )}
                                </div>
                        </div>
                </div>
        );
};
