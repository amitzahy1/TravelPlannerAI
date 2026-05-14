import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Eye, AlertTriangle } from 'lucide-react';
import { Trip } from '../types';
import { getSharedTrip } from '../services/firestoreService';
import { LayoutFixed as Layout } from './LayoutFixed';
import { ViewSkeleton } from './shared';
import { LandingPage } from './LandingPage';
import { InviteeWelcome } from './onboarding/InviteeWelcome';

const FlightsView = React.lazy(() => import('./FlightsView').then(m => ({ default: m.FlightsView })));
const ItineraryView = React.lazy(() => import('./ItineraryView').then(m => ({ default: m.ItineraryView })));
const HotelsView = React.lazy(() => import('./HotelsView').then(m => ({ default: m.HotelsView })));
const RestaurantsView = React.lazy(() => import('./RestaurantsView').then(m => ({ default: m.RestaurantsView })));
const AttractionsView = React.lazy(() => import('./AttractionsView').then(m => ({ default: m.AttractionsView })));
const FullTripMapView = React.lazy(() => import('./FullTripMapView').then(m => ({ default: m.FullTripMapView })));

interface GuestTripViewProps {
    shareId: string;
    role: 'editor' | 'viewer';
    onSignIn: () => Promise<void>;
}

export const GuestTripView: React.FC<GuestTripViewProps> = ({ shareId, role, onSignIn }) => {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState('itinerary');
    const [signingIn, setSigningIn] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const t = await getSharedTrip(shareId);
                if (!mounted) return;
                if (!t) {
                    setError('הטיול לא נמצא או שהקישור פג תוקף.');
                } else {
                    setTrip({
                        ...t,
                        isShared: true,
                        sharing: { ...(t.sharing || {}), role: 'viewer', shareId },
                    } as Trip);
                    // Show the welcome carousel once per shareId per device
                    try {
                        const seenKey = `seenInviteeWelcome:${shareId}`;
                        if (!localStorage.getItem(seenKey)) setShowWelcome(true);
                    } catch {
                        setShowWelcome(true);
                    }
                }
            } catch (e: any) {
                console.error('Guest trip load failed:', e);
                setError('שגיאה בטעינת הטיול.');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [shareId]);

    const handleSignIn = async () => {
        setSigningIn(true);
        try {
            await onSignIn();
        } finally {
            setSigningIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border-b-2 border-blue-600 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">טוען את הטיול…</span>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-4" dir="rtl">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="text-slate-800 font-bold text-center">{error || 'טיול לא זמין'}</div>
                <LandingPage onLogin={onSignIn} />
            </div>
        );
    }

    const noop = () => { };

    const renderContent = () => {
        const onUpdate = noop;
        return (
            <React.Suspense fallback={<ViewSkeleton />}>
                {(() => {
                    switch (currentTab) {
                        case 'flights': return <FlightsView trip={trip} onUpdateTrip={onUpdate} />;
                        case 'hotels': return <HotelsView trip={trip} onUpdateTrip={onUpdate} />;
                        case 'restaurants': return <RestaurantsView trip={trip} onUpdateTrip={onUpdate} />;
                        case 'attractions': return <AttractionsView trip={trip} onUpdateTrip={onUpdate} />;
                        case 'map_full': return <FullTripMapView trip={trip} title="מפת הטיול המלאה" onSwitchTab={setCurrentTab} onUpdateTrip={onUpdate} />;
                        case 'itinerary': return <ItineraryView trip={trip} onUpdateTrip={onUpdate} onSwitchTab={setCurrentTab} onRefresh={noop} />;
                        default: return <ItineraryView trip={trip} onUpdateTrip={onUpdate} onSwitchTab={setCurrentTab} />;
                    }
                })()}
            </React.Suspense>
        );
    };

    const cta = role === 'editor' ? 'התחבר כדי לערוך' : 'התחבר כדי לשמור בטיולים שלי';

    return (
        <>
            <Layout
                activeTrip={trip}
                trips={[trip]}
                onSwitchTrip={noop}
                currentTab={currentTab}
                onSwitchTab={setCurrentTab}
                onOpenAdmin={noop}
                onUpdateTrip={noop}
                onDeleteTrip={noop}
            >
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="rounded-2xl bg-gradient-to-l from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg mb-4"
                    dir="rtl"
                >
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="shrink-0 w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                <Eye className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] font-black opacity-90 tracking-wider uppercase">מצב צפייה</div>
                                <div className="text-[12px] font-bold opacity-95 truncate">{cta}</div>
                            </div>
                        </div>
                        <button
                            onClick={handleSignIn}
                            disabled={signingIn}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-indigo-700 text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60"
                        >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>{signingIn ? '…' : 'התחבר עם Google'}</span>
                        </button>
                    </div>
                </motion.div>
                <main role="main" tabIndex={-1}>
                    {renderContent()}
                </main>
            </Layout>

            <AnimatePresence>
                {showWelcome && (
                    <InviteeWelcome
                        trip={trip}
                        onDismiss={() => {
                            try { localStorage.setItem(`seenInviteeWelcome:${shareId}`, '1'); } catch { /* noop */ }
                            setShowWelcome(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
