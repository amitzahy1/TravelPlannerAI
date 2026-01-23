import React, { useState } from 'react';
import { Trip } from '../types';
import { createSharedTrip } from '../services/firestoreService';
import { X, Link, Copy, Check, Users, Shield, Globe } from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface ShareModalProps {
        trip: Trip;
        onClose: () => void;
        onUpdateTrip: (t: Trip) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ trip, onClose, onUpdateTrip }) => {
        const [loading, setLoading] = useState(false);
        const [copied, setCopied] = useState(false);
        const [error, setError] = useState('');

        const auth = getAuth();
        const user = auth.currentUser;
        const isShared = trip.isShared && trip.sharing?.shareId;

        const shareUrl = isShared
                ? `${window.location.origin}/#/join/${trip.sharing?.shareId}`
                : '';

        const handleCreateShare = async () => {
                if (!user) {
                        setError('עליך להיות מחובר כדי לשתף טיול');
                        return;
                }

                setLoading(true);
                setError('');
                try {
                        const shareId = await createSharedTrip(user.uid, trip);

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
                        setError('אירעה שגיאה ביצירת השיתוף. נסה שנית.');
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
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
                                <button
                                        onClick={onClose}
                                        className="absolute top-4 left-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                        <X className="w-5 h-5" />
                                </button>

                                <div className="p-8 text-center">
                                        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Users className="w-8 h-8 text-blue-600" />
                                        </div>

                                        <h2 className="text-2xl font-black text-slate-800 mb-2">שתף את הטיול</h2>
                                        <p className="text-slate-500 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
                                                הזמן חברים ומשפחה לערוך את הטיול איתך בזמן אמת. כל שינוי שיעשו יתעדכן אצל כולם.
                                        </p>

                                        {error && (
                                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">
                                                        {error}
                                                </div>
                                        )}

                                        {!isShared ? (
                                                <button
                                                        onClick={handleCreateShare}
                                                        disabled={loading}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                                >
                                                        {loading ? (
                                                                <span className="animate-spin">⌛</span>
                                                        ) : (
                                                                <>
                                                                        <Link className="w-5 h-5" /> צור לינק לשיתוף
                                                                </>
                                                        )}
                                                </button>
                                        ) : (
                                                <div className="space-y-4 animate-fade-in">
                                                        <div className="bg-slate-50 border-2 border-slate-100 p-1 rounded-2xl flex items-center gap-2">
                                                                <div className="bg-white flex-grow p-3 rounded-xl text-left text-xs text-slate-600 font-mono truncate border border-slate-100 select-all">
                                                                        {shareUrl}
                                                                </div>
                                                                <button
                                                                        onClick={handleCopy}
                                                                        className={`p-3 rounded-xl font-bold transition-all flex items-center justify-center ${copied
                                                                                        ? 'bg-green-500 text-white shadow-md'
                                                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                                                                }`}
                                                                >
                                                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                                                </button>
                                                        </div>

                                                        <div className="flex items-center justify-center gap-6 mt-6">
                                                                <div className="flex flex-col items-center gap-1">
                                                                        <div className="bg-green-100 p-2 rounded-full text-green-600"><Shield className="w-5 h-5" /></div>
                                                                        <span className="text-[10px] font-bold text-slate-500">מאובטח</span>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                        <div className="bg-purple-100 p-2 rounded-full text-purple-600"><Globe className="w-5 h-5" /></div>
                                                                        <span className="text-[10px] font-bold text-slate-500">צפייה בדפדפן</span>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                        <div className="bg-orange-100 p-2 rounded-full text-orange-600"><Users className="w-5 h-5" /></div>
                                                                        <span className="text-[10px] font-bold text-slate-500">עריכה משותפת</span>
                                                                </div>
                                                        </div>
                                                </div>
                                        )}
                                </div>
                        </div>
                </div>
        );
};
