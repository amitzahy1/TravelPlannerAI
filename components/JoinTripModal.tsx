import React, { useState, useEffect, useRef } from 'react';
import { Trip, TripInvite } from '../types';
import { getSharedTripInvite, joinSharedTrip } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { Globe, Users, Shield, Check, X, Plane, AlertTriangle } from 'lucide-react';

interface JoinTripModalProps {
        shareId: string;
        role?: 'editor' | 'viewer';
        onClose: () => void;
        onJoinSuccess: (trip: Trip) => void;
}

export const JoinTripModal: React.FC<JoinTripModalProps> = ({ shareId, role = 'editor', onClose, onJoinSuccess }) => {
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [tripPreview, setTripPreview] = useState<TripInvite | null>(null);
        const [joining, setJoining] = useState(false);

        // useAuth (not getAuth().currentUser) so the modal re-renders when
        // the user signs in WHILE the modal is open — e.g., guest viewer
        // who hit "התחבר עם Google" from GuestTripView. Without this, the
        // modal captured `currentUser` at first render (null) and stayed
        // stuck on the "log in to join" copy after auth succeeded.
        const { user } = useAuth();
        const autoJoinedRef = useRef(false);

        useEffect(() => {
                const fetchTrip = async () => {
                        try {
                                const trip = await getSharedTripInvite(shareId);
                                if (trip) {
                                        setTripPreview(trip);
                                } else {
                                        setError('Trip not found or link expired.');
                                }
                        } catch (err) {
                                console.error("Error fetching shared trip:", err);
                                setError('Failed to load shared trip details.');
                        } finally {
                                setLoading(false);
                        }
                };

                if (shareId) fetchTrip();
        }, [shareId]);

        const handleJoin = async () => {
                if (!user || !tripPreview) return;

                setJoining(true);
                try {
                        // Use the shareId from props, not the trip internal ID!
                        const joinedTrip = await joinSharedTrip(user.uid, shareId, user.email || 'Unknown User', role);
                        onJoinSuccess(joinedTrip);
                        // The parent component should handle saving/updating current user state
                } catch (err: any) {
                        console.error("Error joining trip:", err);
                        setError(err.message || 'Failed to join trip.');
                } finally {
                        setJoining(false);
                }
        };

        // Auto-join once authenticated. Clicking the share link IS the
        // user's intent to join — there's no reason to gate them behind a
        // second "Join Trip" button. Fires only when the user shows up
        // already authenticated OR completes a Google sign-in from the
        // guest-view shell. Ref guards against double-firing in StrictMode.
        useEffect(() => {
                if (user && tripPreview && !joining && !error && !autoJoinedRef.current) {
                        autoJoinedRef.current = true;
                        handleJoin();
                }
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [user, tripPreview]);

        if (loading) {
                return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
                                <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                                        <p className="text-slate-500 font-medium">Finding Trip...</p>
                                </div>
                        </div>
                );
        }

        if (error || !tripPreview) {
                return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in">
                                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center relative border border-slate-100">
                                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                                                <AlertTriangle className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-800 mb-2">Link Error</h2>
                                        <p className="text-slate-500 mb-6">{error || 'Something went wrong.'}</p>
                                        <button onClick={onClose} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">
                                                Close
                                        </button>
                                </div>
                        </div>
                );
        }

        return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/20">
                                {/* Header Image */}
                                <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url(${tripPreview.coverImage})` }}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors">
                                                <X className="w-5 h-5" />
                                        </button>
                                        <div className="absolute bottom-4 left-6 text-white">
                                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
                                                        <Globe className="w-3 h-3" /> Shared Trip Invitation
                                                </div>
                                                <h2 className="text-2xl font-black leading-tight shadow-sm">{tripPreview.tripName}</h2>
                                        </div>
                                </div>

                                <div className="p-8">
                                        <div className="flex items-center gap-4 mb-8">
                                                <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-1">
                                                        <Users className="w-6 h-6 text-indigo-500 mb-1" />
                                                        <span className="text-[10px] uppercase font-black text-slate-400">Collaborate</span>
                                                </div>
                                                <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-1">
                                                        <Shield className="w-6 h-6 text-emerald-500 mb-1" />
                                                        <span className="text-[10px] uppercase font-black text-slate-400">Secure</span>
                                                </div>
                                                <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-1">
                                                        <Plane className="w-6 h-6 text-blue-500 mb-1" />
                                                        <span className="text-[10px] uppercase font-black text-slate-400">Travel</span>
                                                </div>
                                        </div>

                                        <div className="text-center mb-6">
                                                <p className="text-slate-600 font-medium">
                                                        הוזמנת להצטרף לטיול <span className="font-black text-slate-800">{tripPreview.tripName}</span>.
                                                </p>
                                        </div>

                                        <div className={`mb-6 p-4 rounded-2xl border text-center ${role === 'viewer' ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                        <span className="text-lg">{role === 'viewer' ? '👀' : '✏️'}</span>
                                                        <span className={`text-sm font-black ${role === 'viewer' ? 'text-slate-700' : 'text-blue-700'}`}>
                                                                {role === 'viewer' ? 'הזמנת צפייה' : 'הזמנת עריכה'}
                                                        </span>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                        {role === 'viewer'
                                                                ? 'תוכל לעיין בכל מה שהבונה תכנן ולעשות מחקר אישי. שינויים שלך יישמרו רק במכשיר הזה.'
                                                                : 'תוכל להוסיף ולערוך פריטים בטיול. השינויים שלך יראו לכל המשתתפים.'}
                                                </p>
                                        </div>

                                        {!user ? (
                                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-amber-700 text-sm font-bold text-center mb-4">
                                                        Please log in to your account first to join this trip.
                                                </div>
                                        ) : (
                                                <button
                                                        onClick={handleJoin}
                                                        disabled={joining}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                        {joining ? <span className="animate-spin">⌛</span> : <><Check className="w-5 h-5" /> Join Trip</>}
                                                </button>
                                        )}

                                        {!user && (
                                                <button onClick={onClose} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm">
                                                        I'll log in manually
                                                </button>
                                        )}
                                </div>
                        </div>
                </div>
        );
};
