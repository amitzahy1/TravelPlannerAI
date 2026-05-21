import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Mailbox } from '../Mailbox';
import { Trip, type TravelersComposition } from '../../types';
import { isMailboxTrip, claimMailboxTrip, mergeTripIntoTarget } from '../../utils/mailbox';
import { saveTrip, deleteTrip } from '../../services/firestoreService';
import { Mail } from 'lucide-react';
import { TripDetailsPanel, type GroupType } from './TripDetailsPanel';

interface Step3MailboxProps {
        onComplete: (data: { mailboxClaimedTripId?: string }) => void;
        onBack: () => void;
        country?: string;
        cities: string[];
        travelers: TravelersComposition;
        groupType?: GroupType;
        onCitiesChange: (next: string[]) => void;
        onTravelersChange: (next: TravelersComposition) => void;
        onGroupTypeChange: (next: GroupType | undefined) => void;
}

/**
 * Wizard-embedded variant of the persistent mailbox. Uses the same `<Mailbox>`
 * core that the always-on header drawer / mobile bottom-sheet use. Subscribes
 * to the user's trips collection in real-time so a freshly forwarded email
 * appears here within seconds.
 */
export const Step3_Mailbox: React.FC<Step3MailboxProps> = ({
        onComplete,
        country,
        cities,
        travelers,
        groupType,
        onCitiesChange,
        onTravelersChange,
        onGroupTypeChange,
}) => {
        const { user } = useAuth();
        const [trips, setTrips] = useState<Trip[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
                if (!user) { setLoading(false); return; }
                const q = query(collection(db, 'users', user.uid, 'trips'));
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
                                        השתמשו בשיטה זו אם ההזמנות שלכם מגיעות במייל. העבירו אישורי הזמנה (Booking, Airbnb, חברת תעופה) לכתובת אישית שתופיע כאן — וה-AI יבנה את הטיול אוטומטית. אפשר להעביר עוד מיילים בכל שלב.
                                </p>
                        </div>

                        {/* Optional trip-details panel — for the mailbox path the hints don't
                            flow directly into AI extraction (email handler runs server-side at
                            email-arrival time), but the cities/travelers still land on the final
                            Trip so HotelsView room-count checks etc. have the data. */}
                        <div className="px-4 mb-3 flex-shrink-0">
                                <TripDetailsPanel
                                        country={country}
                                        cities={cities}
                                        travelers={travelers}
                                        groupType={groupType}
                                        onCitiesChange={onCitiesChange}
                                        onTravelersChange={onTravelersChange}
                                        onGroupTypeChange={onGroupTypeChange}
                                />
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
