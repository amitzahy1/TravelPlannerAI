import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { queryClient } from './services/queryClient';
import { LayoutFixed as Layout } from './components/LayoutFixed';
import { cleanupDuplicateStoredTrips, saveTrips, saveSingleTrip } from './services/storageService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Trip } from './types';
import { LandingPage } from './components/LandingPage';
import { UnifiedMapView } from './components/UnifiedMapView';
import { FullTripMapView } from './components/FullTripMapView';
import { useTrips, useTripMutations } from './hooks/useTrips';
import { useTripStore } from './stores/useTripStore';

// Lazy Load Heavy Views
const FlightsView = React.lazy(() => import('./components/FlightsView').then(module => ({ default: module.FlightsView })));
const ItineraryView = React.lazy(() => import('./components/ItineraryView').then(module => ({ default: module.ItineraryView })));
const HotelsView = React.lazy(() => import('./components/HotelsView').then(module => ({ default: module.HotelsView })));
const AdminView = React.lazy(() => import('./components/AdminView').then(module => ({ default: module.AdminView })));
const DiscoverView = React.lazy(() => import('./components/DiscoverView').then(module => ({ default: module.DiscoverView })));
const RestaurantsView = React.lazy(() => import('./components/RestaurantsView').then(module => ({ default: module.RestaurantsView })));
const AttractionsView = React.lazy(() => import('./components/AttractionsView').then(module => ({ default: module.AttractionsView })));

import { JoinTripModal } from './components/JoinTripModal';
import { AIChatOverlay } from './components/AIChatOverlay';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { Toaster } from './components/ui/Toaster';
import { toast } from './stores/useToastStore';
import { runBackgroundResearch } from './services/backgroundResearch';
import { MagicalWizard } from './components/onboarding/MagicalWizard';
import { InviteeWelcome } from './components/onboarding/InviteeWelcome';
import { TripListSkeleton, ViewSkeleton } from './components/shared';
import { getDestinationCover } from './utils/destinationCover';
import { DemoWelcomePage } from './pages/DemoWelcomePage';
import { GuestTripView } from './components/GuestTripView';
import { withActivityLog } from './services/activityLog';

const getJoinShareIdFromHash = (): { shareId: string; role: 'editor' | 'viewer' } | null => {
  const hash = window.location.hash;
  if (!hash.startsWith('#/join/')) return null;
  const tail = hash.replace('#/join/', '');
  const [shareIdRaw, qs] = tail.split('?');
  const shareId = (shareIdRaw || '').trim();
  if (!shareId) return null;
  // Parse ?role=editor / ?role=viewer (defaults to 'editor' for legacy links)
  let role: 'editor' | 'viewer' = 'editor';
  if (qs) {
    const params = new URLSearchParams(qs);
    const r = (params.get('role') || '').toLowerCase();
    if (r === 'viewer') role = 'viewer';
    else if (r === 'editor') role = 'editor';
  }
  return { shareId, role };
};

// ...

// Main App Logic
// ...
// ... state

// --- MAIN APP CONTENT (Decoupled) ---
const AppContent: React.FC = () => {
  const { user, signIn, loading: authLoading } = useAuth();

  // New Architecture Hooks
  const { trips, isLoading, error, activeTrip } = useTrips();
  const { deleteTripMutation, leaveTripMutation, updateTripMutation } = useTripMutations();
  const { setActiveTripId, activeTripId } = useTripStore();

  // Local UI State
  const [currentTab, setCurrentTab] = useState('itinerary');
  // showAdmin removed - using 'trips' tab instead
  const [joinShareId, setJoinShareId] = useState<{ shareId: string; role: 'editor' | 'viewer' } | null>(() => getJoinShareIdFromHash());
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Once-per-shareId welcome carousel for invitees who just joined a shared trip.
  const [welcomeForShareId, setWelcomeForShareId] = useState<string | null>(null);
  const [welcomeForTrip, setWelcomeForTrip] = useState<Trip | null>(null);

  // Deep Link Handling
  useEffect(() => {
    const handleHashChange = () => {
      const shareId = getJoinShareIdFromHash();
      if (shareId) {
        console.log("🔗 Detected Join Link:", shareId);
        setJoinShareId(shareId);
        setShowOnboarding(false);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync Active Trip Persistence
  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem('lastTripId', activeTripId);
    }
  }, [activeTripId]);

  // Default Active Trip Logic (If none selected)
  useEffect(() => {
    if (!isLoading && trips.length > 0 && !activeTrip) {
      const lastTripId = localStorage.getItem('lastTripId');
      if (lastTripId && trips.find(t => t.id === lastTripId)) {
        setActiveTripId(lastTripId);
      } else {
        setActiveTripId(trips[trips.length - 1].id);
      }
    }
  }, [isLoading, trips, activeTrip, setActiveTripId]);

  // Auto-Open Onboarding
  useEffect(() => {
    const hasJoinLink = !!joinShareId || !!getJoinShareIdFromHash();
    if (!isLoading && !authLoading && trips.length === 0 && !hasJoinLink) {
      setShowOnboarding(true);
    }
  }, [isLoading, authLoading, trips.length, joinShareId]);

  // First-visit welcome — show the InviteeWelcome carousel once per device
  // on app entry whenever the user has at least one trip available, even if
  // they didn't arrive via a shared-trip link. localStorage flag prevents
  // re-popping on every refresh.
  useEffect(() => {
    if (isLoading || authLoading) return;
    if (welcomeForShareId) return; // shared-trip welcome already showing
    if (!activeTrip) return; // need an active trip for the slide content
    try {
      const seen = localStorage.getItem('weTravel.firstVisitWelcome.v1');
      if (seen === '1') return;
      setWelcomeForShareId(`first-visit-${activeTrip.id}`);
      setWelcomeForTrip(activeTrip);
    } catch { /* private mode — show anyway */ }
  }, [isLoading, authLoading, activeTrip?.id, welcomeForShareId]);

  // Scroll to top on tab change — without this the new view inherits the
  // previous view's scroll position, so e.g. switching to Hotels from a
  // long Itinerary lands the user at the bottom of the hotels list.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentTab, activeTripId]);

  // Loading State
  if (authLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-sky-400 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 bg-slate-200 rounded-pill animate-pulse" />
              <div className="h-2 w-20 bg-slate-100 rounded-pill animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-9 rounded-pill bg-slate-200 animate-pulse" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-b-2 border-blue-600 animate-spin" />
          <span className="text-xs text-slate-500 font-semibold">טוען פרופיל…</span>
        </div>
      </div>
    );
  }

  // Not Logged In — but if they have a /join/ link, let them browse as guest.
  // Writes are blocked client-side (viewerMode) and server-side (Firestore rules
  // require auth + collaborators membership). Login is offered via top banner.
  if (!user) {
    if (joinShareId) {
      return <GuestTripView shareId={joinShareId.shareId} role={joinShareId.role} onSignIn={signIn} />;
    }
    return <LandingPage onLogin={signIn} />;
  }

  // Loading Data
  if (isLoading) {
    return <TripListSkeleton />;
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-500 text-lg font-bold">שגיאה בטעינת הנתונים</div>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-xl shadow-lg">
          נסה שוב
        </button>
      </div>
    );
  }

  const handleWizardComplete = async (wizardData: any) => {
    console.log("Wizard Complete:", wizardData);

    const analysis = wizardData.analysisResult;
    const rawData = analysis?.rawStagedData;

    let flightSegments: any[] = [];
    let flightPnr = "";
    let hotels: any[] = [];

    if (wizardData.method === 'text' && wizardData.freeTextResult) {
      // Free-text path: data is already in the target shape (hotels: HotelBooking[], flights: FlightSegment[])
      hotels = wizardData.freeTextResult.hotels || [];
      flightSegments = wizardData.freeTextResult.flights || [];
    } else if (rawData) {
      // Smart Import path: map from rawStagedData categories
      flightSegments = rawData.categories?.transport?.map((t: any) => ({
        fromCode: t.data.departure?.iata || "",
        fromCity: t.data.departure?.city || "",
        toCode: t.data.arrival?.iata || "",
        toCity: t.data.arrival?.city || "",
        departureTime: t.data.departure?.displayTime || "",
        arrivalTime: t.data.arrival?.displayTime || "",
        flightNumber: t.data.flightNumber || "",
        airline: t.data.airline || "",
        duration: "",
        date: t.data.departure?.isoDate || "",
        price: t.data.price?.amount
      })) || [];

      flightPnr = rawData.categories?.transport?.[0]?.data?.pnr || "";

      hotels = rawData.categories?.accommodation?.map((h: any) => ({
        id: crypto.randomUUID(),
        name: h.data.hotelName || "Hotel",
        address: h.data.address || "",
        checkInDate: h.data.checkIn?.isoDate || "",
        checkOutDate: h.data.checkOut?.isoDate || "",
        nights: 0, // Calculate if needed
        bookingSource: 'Direct',
        confirmationCode: h.data.bookingId || "",
        price: h.data.price?.amount ? `${h.data.price.amount} ${h.data.price.currency || ''}` : "",
        lat: 0, lng: 0
      })) || [];
    }
    // Manual path: hotels & flights stay empty

    // Determine Metadata from AI or Wizard Input
    const dest = analysis?.metadata?.destination || wizardData.destination || "";
    const name = analysis?.metadata?.suggestedName || (dest ? `Trip to ${dest}` : "New Adventure");
    const dates = (analysis?.metadata?.startDate && analysis?.metadata?.endDate)
      ? `${analysis.metadata.startDate} - ${analysis.metadata.endDate}`
      : (wizardData.startDate ? `${wizardData.startDate} - ${wizardData.endDate}` : "");

    const newTrip: Trip = {
      id: crypto.randomUUID(),
      name,
      destination: dest,
      dates,
      coverImage: getDestinationCover(dest),
      flights: {
        passengers: user?.displayName ? [user.displayName] : [],
        pnr: flightPnr,
        segments: flightSegments
      },
      hotels,
      restaurants: [],
      attractions: [],
      itinerary: [],
      documents: [],
      secureNotes: [],
      isShared: false,
      // Generate itinerary days for the full trip duration
      ...(() => {
        const startStr = analysis?.metadata?.startDate || wizardData.startDate;
        const endStr = analysis?.metadata?.endDate || wizardData.endDate;
        if (!startStr || !endStr) return {};

        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return {};

        const days = [];
        const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        for (let i = 0; i < totalDays; i++) {
          const dayDate = new Date(start);
          dayDate.setDate(dayDate.getDate() + i);
          const isoDate = dayDate.toISOString().split('T')[0];

          let title: string;
          if (i === 0) title = `Arrival in ${dest}`;
          else if (i === totalDays - 1) title = `Departure from ${dest}`;
          else title = `Day ${i + 1} in ${dest}`;

          days.push({
            id: crypto.randomUUID(),
            day: i + 1,
            date: isoDate,
            title,
            activities: []
          });
        }
        return { itinerary: days };
      })()
    };

    try {
      // Use saveSingleTrip instead of saveTrips([...trips, newTrip]) — captures fresh state
      // from Firestore write, avoids stale-closure risk of the `trips` array.
      await saveSingleTrip(newTrip, user?.uid);
      setActiveTripId(newTrip.id);
      setShowOnboarding(false);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(`הטיול "${newTrip.name || newTrip.destination}" נוצר בהצלחה!`);

      // Fire-and-forget: start AI research for food + attractions in the
      // background so results are ready when the user navigates to those
      // tabs. Saves partial results to Firestore after each city — React
      // Query will pick them up on the next invalidation.
      runBackgroundResearch(newTrip, user?.uid)
        .then(() => queryClient.invalidateQueries({ queryKey: ['trips'] }))
        .catch(err => console.warn('Background research error (non-fatal):', err));
    } catch (error) {
      console.error("Failed to save trip:", error);
      toast.error("שגיאה בשמירת הטיול. נסה שוב.");
    }
  };

  const renderContent = () => {
    // Admin View is now a main tab ('trips')
    if (currentTab === 'trips') {
      return (
        <React.Suspense fallback={<ViewSkeleton />}>
          <AdminView
            data={trips}
            currentTripId={activeTripId || undefined}
            onSave={async (updatedTrips) => {
              try {
                await saveTrips(updatedTrips, user?.uid);
                queryClient.invalidateQueries({ queryKey: ['trips'] });
              } catch (error) {
                console.error("Failed to save trips:", error);
              }
            }}
            onSwitchTrip={(id) => {
              setActiveTripId(id);
              // Ensure we stay on trips view or switch to itinerary? 
              // User likely wants to manage the trip they just switched to, so we keep them here or move them.
              // Let's keep them on 'trips' view for now as it acts as a dashboard.
            }}
            onDeleteTrip={(id) => deleteTripMutation.mutate(id)}
            onLeaveTrip={(id) => {
              const tripToLeave = trips.find(t => t.id === id);
              if (tripToLeave?.sharing?.shareId) {
                leaveTripMutation.mutate({ tripId: id, shareId: tripToLeave.sharing.shareId });
              }
            }}
            onCleanupDuplicates={async (preferredTripId) => {
              if (!user?.uid) return { deletedCount: 0 };
              const plan = await cleanupDuplicateStoredTrips(user.uid, user.email || undefined, preferredTripId);
              await queryClient.invalidateQueries({ queryKey: ['trips'] });
              return {
                deletedCount: plan.deletePrivateTripIds.length,
                deletedTripIds: plan.deletePrivateTripIds,
                keptTripId: plan.keepTripIds[0],
              };
            }}
            onClose={() => setCurrentTab('itinerary')} // Close goes back to main
          />
        </React.Suspense>
      );
    }

    if (!activeTrip) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <p>בחר טיול מהתפריט או צור טיול חדש</p>
        </div>
      );
    }

    const handleUpdate = (updatedTrip: Trip) => {
      const prev = trips.find(t => t.id === updatedTrip.id);
      let next = updatedTrip;
      if (prev && user) {
        next = withActivityLog(prev, updatedTrip, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'משתמש',
        });
      }
      updateTripMutation.mutate(next);
    };

    return (
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      }>
        {(() => {
          switch (currentTab) {
            case 'flights': return <FlightsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            // R6 — Food and Attractions are now separate top-nav tabs again.
            // 'discover' is kept as a legacy alias that lands on Food.
            case 'restaurants':
            case 'food':
            case 'discover':
              return <RestaurantsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'attractions':
            case 'sights':
              return <AttractionsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'itinerary': return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdate} onSwitchTab={setCurrentTab} onRefresh={() => { }} />;
            case 'hotels': return <HotelsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'map_full': return <FullTripMapView trip={activeTrip} title="מפת הטיול המלאה" onSwitchTab={setCurrentTab} onUpdateTrip={handleUpdate} />;
            default: return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdate} onSwitchTab={setCurrentTab} />;
          }
        })()}
      </React.Suspense>
    );
  };

  return (
    <HashRouter>
      <a href="#main-content" className="skip-to-content">דלג לתוכן</a>
      <Layout
        activeTrip={activeTrip}
        trips={trips}
        onSwitchTrip={setActiveTripId}
        currentTab={currentTab}
        onSwitchTab={setCurrentTab}
        onOpenAdmin={() => setShowOnboarding(true)}
        onUpdateTrip={(t) => updateTripMutation.mutate(t)}
        onDeleteTrip={(id) => deleteTripMutation.mutate(id)}
      >
        <main id="main-content" role="main" tabIndex={-1}>
          {renderContent()}
        </main>
      </Layout>

      {/* Magical Onboarding Wizard */}
      <AnimatePresence>
        {showOnboarding && (
          <MagicalWizard
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
            onComplete={handleWizardComplete}
          />
        )}
      </AnimatePresence>



      {joinShareId && (
        <JoinTripModal
          shareId={joinShareId.shareId}
          role={joinShareId.role}
          onClose={() => {
            setJoinShareId(null);
            window.history.replaceState(null, '', window.location.pathname);
          }}
          onJoinSuccess={(newTrip) => {
            const justJoinedShareId = joinShareId.shareId;
            setJoinShareId(null);
            saveSingleTrip(newTrip, user?.uid).then(() => {
              setActiveTripId(newTrip.id);
              queryClient.invalidateQueries({ queryKey: ['trips'] });
            });
            window.history.replaceState(null, '', window.location.pathname);
            // First-open invitee carousel — once per shareId per device.
            try {
              const seenKey = `seenInviteeWelcome:${justJoinedShareId}`;
              if (justJoinedShareId && !localStorage.getItem(seenKey)) {
                setWelcomeForShareId(justJoinedShareId);
                setWelcomeForTrip(newTrip);
              }
            } catch {
              // localStorage may be unavailable in private mode — show carousel anyway.
              setWelcomeForShareId(justJoinedShareId);
              setWelcomeForTrip(newTrip);
            }
          }}
        />
      )}

      {welcomeForShareId && welcomeForTrip && (
        <InviteeWelcome
          trip={welcomeForTrip}
          ownerName={welcomeForTrip.sharing?.owner ? undefined : undefined}
          onDismiss={() => {
            try {
              localStorage.setItem(`seenInviteeWelcome:${welcomeForShareId}`, '1');
              // Always mark first-visit seen too so a non-share dismissal
              // also stops the welcome from re-popping on every refresh.
              localStorage.setItem('weTravel.firstVisitWelcome.v1', '1');
            } catch { /* noop */ }
            setWelcomeForShareId(null);
            setWelcomeForTrip(null);
          }}
        />
      )}

      {activeTrip && (
        <AIChatOverlay trip={activeTrip} />
      )}

      <PwaInstallPrompt />

      <Toaster />
    </HashRouter>
  );
};

const isDemoWelcomeHash = () => {
  const h = (window.location.hash || '').toLowerCase().replace(/\/$/, '');
  return h === '#/demo-welcome' || h === '#demo-welcome';
};

const App: React.FC = () => {
  const [isDemo, setIsDemo] = useState(isDemoWelcomeHash());
  useEffect(() => {
    const onHash = () => setIsDemo(isDemoWelcomeHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  if (isDemo) {
    return <DemoWelcomePage />;
  }
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;
