import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Mailbox } from '../Mailbox';
import { Trip } from '../../types';
import { isMailboxTrip, claimMailboxTrip, mergeTripIntoTarget } from '../../utils/mailbox';
import { saveTrip, deleteTrip } from '../../services/firestoreService';
import { Mail } from 'lucide-react';

interface Step3MailboxProps {
        onComplete: (data: { mailboxClaimedTripId?: string }) => void;
        onBack: () => void;
}

/**
 * Wizard-embedded variant of the persistent mailbox. Uses the same `<Mailbox>`
 * core that the always-on header drawer / mobile bottom-sheet use. Subscribes
 * to the user's trips collection in real-time so a freshly forwarded email
 * appears here within seconds.
 */
export const Step3_Mailbox: React.FC<Step3MailboxProps> = ({ onComplete }) => {
        const { user } = useAuth();
        const [trips, setTrips] = useState<Trip[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
                if (!user) { setLoading(false); return; }
                const q = query(
                        collection(db, 'users', user.uid, 'trips'),
                        orderBy('id', 'desc')
                );
                const unsub = onSnapshot(q, snap => {
                        const next: Trip[] = [];
                        snap.forEach(doc => next.push(doc.data() as Trip));
                        setTrips(next);
                        setLoading(false);
                });
                return () => unsub();
        }, [user?.uid]);

        const handleClaim = async (tripId: string) => {
                if (!user) return;
                const trip = trips.find(t => t.id === tripId);
                if (!trip) return;
                await saveTrip(user.uid, claimMailboxTrip(trip));
                onComplete({ mailboxClaimedTripId: tripId });
        };

        const handleMerge = async (sourceId: string, targetId: string) => {
                if (!user) return;
                const source = trips.find(t => t.id === sourceId);
                const target = trips.find(t => t.id === targetId);
                if (!source || !target) return;
                const merged = mergeTripIntoTarget(target, source);
                await saveTrip(user.uid, merged);
                await deleteTrip(user.uid, sourceId);
                onComplete({ mailboxClaimedTripId: targetId });
        };

        const handleDelete = async (tripId: string) => {
                if (!user) return;
                await deleteTrip(user.uid, tripId);
        };

        return (
                <div className="w-full max-w-3xl mx-auto h-full flex flex-col" dir="rtl">
                        <div className="text-center mb-3 flex-shrink-0 px-4">
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-1 flex items-center justify-center gap-2">
                                        <Mail className="w-6 h-6 text-emerald-600" />
                                        תיבת הדואר החכמה
                                </h2>
                                <p className="text-slate-500 text-sm">
                                        העבר אישורי הזמנה לכתובת — ה-AI יבנה לך טיול מהמייל. תוכל להעביר עוד מיילים בכל שלב.
                                </p>
                        </div>

                        <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex-1 min-h-0 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm mx-4 mb-4"
                        >
                                {loading ? (
                                        <div className="h-full flex items-center justify-center text-sm text-slate-400">טוען…</div>
                                ) : (
                                        <Mailbox
                                                trips={trips}
                                                variant="wizard"
                                                title="תיבת הדואר שלי"
                                                onMergeIntoTrip={handleMerge}
                                                onClaimAsTrip={handleClaim}
                                                onDeleteTrip={handleDelete}
                                                onOpenTrip={(id) => onComplete({ mailboxClaimedTripId: id })}
                                        />
                                )}
                        </motion.div>
                </div>
        );
};
