import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip } from '../types';
import { createSharedTrip, ensureSharedTripInvite } from '../services/firestoreService';
import { X, Link, Copy, Check, Users, Shield, Globe, Plus, Pencil, Eye } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { buildShareableInviteUrl } from '../utils/shareUrl';

interface ShareModalProps {
        trip: Trip;
        onClose: () => void;
        onUpdateTrip: (t: Trip) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ trip, onClose, onUpdateTrip }) => {
        const [loading, setLoading] = useState(false);
        const [copiedRole, setCopiedRole] = useState<'editor' | 'viewer' | null>(null);
        const [inviteEmail, setInviteEmail] = useState('');
        const [successMessage, setSuccessMessage] = useState('');
        const [error, setError] = useState('');

        const auth = getAuth();
        const user = auth.currentUser;
        const isShared = trip.isShared && trip.sharing?.shareId;

        // Share URLs now point at the Cloudflare Worker's /share route,
        // which returns Open Graph–tagged HTML so WhatsApp etc. can render
        // a rich preview (trip name + cover image) before bouncing the
        // human into the SPA. The hash-route GitHub Pages URL had no way
        // to expose trip-specific OG metadata.
        const shareId = trip.sharing?.shareId || '';
        const editorUrl = isShared && shareId ? buildShareableInviteUrl(shareId, 'editor') : '';
        const viewerUrl = isShared && shareId ? buildShareableInviteUrl(shareId, 'viewer') : '';

        // [SELF-HEALING] Fix broken links for existing shared trips
        React.useEffect(() => {
                if (isShared && trip.sharing?.shareId && user) {
                        ensureSharedTripInvite(user.uid, trip, trip.sharing.shareId, user.email || undefined);
                }
        }, [isShared, trip.sharing?.shareId, user]);

        const handleCreateShare = async () => {
                if (!user || !user.email) {
                        setError('עליך להיות מחובר עם אימייל תקין כדי לשתף טיול');
                        return;
                }

                setLoading(true);
                setError('');
                setSuccessMessage('');
                try {
                        const shareId = await createSharedTrip(user.uid, trip, user.email, inviteEmail || undefined);

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
                        if (inviteEmail) {
                                setSuccessMessage(`הזמנה נשלחה ל-${inviteEmail}`);
                        }
                } catch (e: any) {
                        console.error('Share error:', e);
                        setError('אירעה שגיאה ביצירת השיתוף. וודא שאתה מחובר ונסה שנית.');
                } finally {
                        setLoading(false);
                }
        };

        const handleCopyRole = (role: 'editor' | 'viewer') => {
                const url = role === 'viewer' ? viewerUrl : editorUrl;
                if (!url) return;
                navigator.clipboard.writeText(url);
                setCopiedRole(role);
                setTimeout(() => setCopiedRole(null), 2000);
        };

        return createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative my-auto">
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

                                        <h2 className="text-3xl font-black text-slate-900 mb-3">שתף טיול</h2>
                                        <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
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
                                                                        className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all text-lg font-medium placeholder:text-slate-400"
                                                                />
                                                        </div>
                                                        <button
                                                                onClick={handleCreateShare}
                                                                disabled={loading}
                                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                                        >
                                                                {loading ? (
                                                                        <span className="animate-spin text-xl">⌛</span>
                                                                ) : (
                                                                        <>
                                                                                <Plus className="w-5 h-5" /> הזמן וצור לינק
                                                                        </>
                                                                )}
                                                        </button>
                                                </div>
                                        ) : (
                                                <div className="space-y-4 animate-fade-in" dir="rtl">
                                                        {/* Editor link card */}
                                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-right">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                        <div className="bg-white p-2 rounded-xl border border-blue-200">
                                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-black text-blue-900">קישור עריכה</div>
                                                                                <div className="text-[11px] text-blue-700/80 leading-tight">מי שיקבל יוכל להוסיף ולערוך פריטים</div>
                                                                        </div>
                                                                </div>
                                                                <div className="bg-white rounded-xl border border-blue-100 flex items-center gap-2 p-1.5">
                                                                        <div className="flex-1 min-w-0 px-2 py-1 text-xs text-slate-500 font-mono truncate select-all" dir="ltr">{editorUrl}</div>
                                                                        <button
                                                                                onClick={() => handleCopyRole('editor')}
                                                                                className={`flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${copiedRole === 'editor'
                                                                                        ? 'bg-emerald-500 text-white'
                                                                                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                                                        >
                                                                                {copiedRole === 'editor' ? <><Check className="w-3.5 h-3.5" /> הועתק</> : <><Copy className="w-3.5 h-3.5" /> העתק</>}
                                                                        </button>
                                                                </div>
                                                        </div>

                                                        {/* Viewer link card */}
                                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                        <div className="bg-white p-2 rounded-xl border border-slate-200">
                                                                                <Eye className="w-4 h-4 text-slate-600" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-black text-slate-800">קישור צפייה</div>
                                                                                <div className="text-[11px] text-slate-500 leading-tight">מי שיקבל יוכל לעיין בלבד — לא יערוך</div>
                                                                        </div>
                                                                </div>
                                                                <div className="bg-white rounded-xl border border-slate-200 flex items-center gap-2 p-1.5">
                                                                        <div className="flex-1 min-w-0 px-2 py-1 text-xs text-slate-500 font-mono truncate select-all" dir="ltr">{viewerUrl}</div>
                                                                        <button
                                                                                onClick={() => handleCopyRole('viewer')}
                                                                                className={`flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${copiedRole === 'viewer'
                                                                                        ? 'bg-emerald-500 text-white'
                                                                                        : 'bg-slate-700 text-white hover:bg-slate-800'}`}
                                                                        >
                                                                                {copiedRole === 'viewer' ? <><Check className="w-3.5 h-3.5" /> הועתק</> : <><Copy className="w-3.5 h-3.5" /> העתק</>}
                                                                        </button>
                                                                </div>
                                                        </div>

                                                        {/* Refresh / Fix Link UI */}
                                                        <div className="flex flex-col gap-3">
                                                                {successMessage ? (
                                                                        <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-2xl border border-emerald-100 animate-bounce-short">
                                                                                {successMessage}
                                                                        </div>
                                                                ) : (
                                                                        <button
                                                                                onClick={handleCreateShare}
                                                                                disabled={loading}
                                                                                className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors py-2 px-4 rounded-xl hover:bg-indigo-50 flex items-center justify-center gap-2 mx-auto"
                                                                        >
                                                                                {loading ? '⌛ מעבד...' : '♻️ חידוש לינק (במקרה של שגיאה)'}
                                                                        </button>
                                                                )}
                                                        </div>
                                                </div>
                                        )}
                                </div>
                        </div>
                </div>,
                document.body
        );
};
