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
// FullTripMapView is lazy-loaded so the Suspense fallback shows a loading
// state immediately on tab click — the bundle splits into its own chunk
// and the page transition feels animated instead of frozen.
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
const FullTripMapView = React.lazy(() => import('./components/FullTripMapView').then(module => ({ default: module.FullTripMapView })));

import { JoinTripModal } from './components/JoinTripModal';
import { WhatsNewModal } from './components/WhatsNewModal';
import { isAdmin } from './utils/isAdmin';
import { RELEASE_NOTES } from './constants/releaseNotes';
import { getLastSeenReleaseVersion, setLastSeenReleaseVersion } from './services/releaseNotesService';
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
import { MenuLayoutDemo } from './pages/MenuLayoutDemo';
import { GuestTripView } from './components/GuestTripView';
import { withActivityLog } from './services/activityLog';
import { DesignPreview } from './components/DesignPreview';

const isMenuDemoRoute = (): boolean => window.location.hash.startsWith('#/demo/menu');
const isDesignPreviewRoute = (): boolean => window.location.hash.startsWith('#/design-preview');

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
  // Standalone menu-layout demo route — bypasses auth and trip loading so
  // the user can preview the 3 layout options without needing to log in.
  // Reload-friendly: re-renders when the hash changes.
  const [isDemoRoute, setIsDemoRoute] = useState(isMenuDemoRoute());
  const [isDesignRoute, setIsDesignRoute] = useState(isDesignPreviewRoute());
  useEffect(() => {
    const onHash = () => {
      setIsDemoRoute(isMenuDemoRoute());
      setIsDesignRoute(isDesignPreviewRoute());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  if (isDemoRoute) {
    return <MenuLayoutDemo />;
  }
  if (isDesignRoute) {
    return <DesignPreview />;
  }

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
  // Admin "What's new" popup — once per release, per user.
  const [showWhatsNew, setShowWhatsNew] = useState(false);

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

  // Admin-only "What's new" popup. Show once per release; the user's
  // dismissal cursor is stored in Firestore + localStorage.
  // Force-show via URL hash `?whatsnew=1` for testing — bypasses the
  // admin check too so non-admins can preview.
  useEffect(() => {
    const forceShow = typeof window !== 'undefined' && /[?&#]whatsnew=1\b/.test(window.location.href);
    if (forceShow) {
      console.log('[WhatsNew] forced via URL');
      setShowWhatsNew(true);
      return;
    }
    if (!user) {
      console.log('[WhatsNew] skip — no user yet');
      return;
    }
    const admin = isAdmin(user);
    console.log('[WhatsNew] user.email=', user.email, 'isAdmin=', admin);
    if (!admin) return;
    let cancelled = false;
    (async () => {
      const latest = RELEASE_NOTES[0]?.version;
      if (!latest) {
        console.log('[WhatsNew] no release notes defined');
        return;
      }
      const seen = await getLastSeenReleaseVersion(user.uid);
      if (cancelled) return;
      console.log('[WhatsNew] latest=', latest, 'seen=', seen);
      if (seen !== latest) setShowWhatsNew(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleDismissWhatsNew = async () => {
    setShowWhatsNew(false);
    if (user) {
      const latest = RELEASE_NOTES[0]?.version;
      if (latest) await setLastSeenReleaseVersion(user.uid, latest);
    }
  };

  // One-shot recovery for the Holiday Inn Pattaya rooms that were deleted
  // by the nested-button bug on 9.5.2026. Triggered by URL flag
  // `?restoreHolidayInnPattayaRooms=1`. Scans all trips, finds the hotel,
  // overlays the 5 rooms (idempotent — won't duplicate if already there),
  // updates trip notes with the special-requests, removes the URL param.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flagged = new URL(window.location.href).searchParams.get('restoreHolidayInnPattayaRooms') === '1';
    if (!flagged) return;
    if (!trips || trips.length === 0) return;
    const ROOMS = [
      { id: 'recover-hipattaya-room1', label: 'חדר 1', roomType: 'Standard Sea View Room', adults: 2, children: 0, beds: '', notes: '' },
      { id: 'recover-hipattaya-room2', label: 'חדר 2', roomType: 'Standard Sea View Room', adults: 1, children: 0, beds: '', notes: '' },
      { id: 'recover-hipattaya-room3', label: 'חדר 3', roomType: 'Suite', adults: 2, children: 1, beds: '', notes: 'תינוק בן 6 חודשים' },
      { id: 'recover-hipattaya-room4', label: 'חדר 4', roomType: 'King Premium — Sea View', adults: 2, children: 2, beds: 'King Bed', notes: 'ילד בן 4.5, פעוט בן 1.5' },
      { id: 'recover-hipattaya-room5', label: 'חדר 5', roomType: 'Standard Sea View Room', adults: 2, children: 3, beds: '', notes: 'ילד בן 10, פעוט בן שנתיים, תינוק בן 6 חודשים' },
    ];
    const SPECIAL_REQUESTS = [
      'בקשה ספציפית לבניין ה-Bay Tower (אזור משפחות).',
      'בשל מספר עגלות התינוק — נדרשת גישה חלקה למעליות, מינימום מדרגות.',
      'בקשה למקם את כל 5 החדרים סמוכים זה לזה.',
    ].join(' ');

    let didChange = false;
    for (const trip of trips) {
      const hotelIdx = (trip.hotels || []).findIndex(h => /holiday\s*inn/i.test(h.name || '') && /pattaya|פטאיה/i.test(`${h.name || ''} ${h.city || ''} ${h.address || ''}`));
      if (hotelIdx === -1) continue;
      const existingHotel = trip.hotels[hotelIdx];
      const existingLabels = new Set((existingHotel.rooms || []).map(r => (r.label || '').trim()));
      const toAdd = ROOMS.filter(r => !existingLabels.has(r.label));
      if (toAdd.length === 0) {
        console.log('[recovery] Holiday Inn Pattaya rooms already present, skipping');
        continue;
      }
      const newHotels = [...trip.hotels];
      newHotels[hotelIdx] = {
        ...existingHotel,
        rooms: [...(existingHotel.rooms || []), ...toAdd],
        notes: existingHotel.notes && existingHotel.notes.includes('Bay Tower')
          ? existingHotel.notes
          : [existingHotel.notes, SPECIAL_REQUESTS].filter(Boolean).join('\n\n'),
      };
      const updated: Trip = { ...trip, hotels: newHotels };
      console.log(`[recovery] restoring ${toAdd.length} rooms to "${existingHotel.name}" in trip "${trip.name}"`);
      updateTripMutation.mutate(updated);
      didChange = true;
    }

    // Remove the URL flag whether we found the hotel or not so a refresh
    // doesn't keep re-running.
    const url = new URL(window.location.href);
    url.searchParams.delete('restoreHolidayInnPattayaRooms');
    window.history.replaceState(null, '', url.toString());
    if (didChange) {
      // Surface a brief feedback. toast lives in useToastStore but we
      // keep the dependency local; alert is acceptable for a one-shot.
      setTimeout(() => alert('שוחזרו 5 החדרים ב-Holiday Inn Pattaya'), 200);
    }
  }, [trips]);

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
      // Wrap in HashRouter so hooks like useSearchParams / useLocation
      // (used by useMapPreferences, FullTripMapView, etc.) have a Router
      // context even before the user logs in.
      return (
        <HashRouter>
          <GuestTripView shareId={joinShareId.shareId} role={joinShareId.role} onSignIn={signIn} />
        </HashRouter>
      );
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

    // Determine Metadata from AI or Wizard Input.
    // When the user picked specific cities in the TripDetailsPanel, prefer the
    // multi-city string ("Vlorë - Tirana, אלבניה") over the country-only Step 1
    // destination — gives chip generators and AI prompts the actual cities to
    // work with. Falls back to whatever was extracted from the import.
    const wizardCities: string[] = Array.isArray(wizardData.cities) ? wizardData.cities : [];
    const country = wizardData.destination || analysis?.metadata?.destination || "";
    const dest = wizardCities.length > 0
      ? [wizardCities.join(' - '), country].filter(Boolean).join(', ')
      : (analysis?.metadata?.destination || country || "");
    const name = analysis?.metadata?.suggestedName || (dest ? `Trip to ${dest}` : "New Adventure");
    const dates = (analysis?.metadata?.startDate && analysis?.metadata?.endDate)
      ? `${analysis.metadata.startDate} - ${analysis.metadata.endDate}`
      : (wizardData.startDate ? `${wizardData.startDate} - ${wizardData.endDate}` : "");

    // Travelers from the optional wizard panel — only persist when at least
    // one count is non-zero, otherwise leave the field unset so existing UIs
    // that check `trip.travelers` continue to fall back to defaults.
    const wizardTravelers = wizardData.travelers;
    const hasTravelers = wizardTravelers
      && (wizardTravelers.adults > 0 || wizardTravelers.children > 0 || wizardTravelers.babies > 0);

    const newTrip: Trip = {
      id: crypto.randomUUID(),
      name,
      destination: dest,
      dates,
      coverImage: getDestinationCover(dest),
      ...(hasTravelers ? { travelers: wizardTravelers } : {}),
      ...(wizardData.groupType ? { groupType: wizardData.groupType } : {}),
      flights: {
        // Don't auto-fill from user.displayName — that's usually just the
        // first name ("Amit"), but airline check-in needs a LAST name.
        // Leave empty and let the user fill it in via FlightsView's edit
        // modal (or let AI extraction populate it from a booking PDF).
        passengers: [],
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
      // tabs. Gated behind a localStorage toggle (off by default since
      // 2026-05-21) because each run fires 4 grounded SEARCH calls ≈
      // $0.20-0.50 of Gemini quota per new trip, often before the user
      // even navigates to the relevant tabs. Admin can enable via the
      // ModelHealthPanel toggle.
      if (localStorage.getItem('autoBgResearch') === 'true') {
        runBackgroundResearch(newTrip, user?.uid)
          .then(() => queryClient.invalidateQueries({ queryKey: ['trips'] }))
          .catch(err => console.warn('Background research error (non-fatal):', err));
      } else {
        console.log('[bgResearch] auto-trigger disabled. Enable in admin → Model Health → "מחקר רקע אוטומטי".');
      }
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
                toast.error("השמירה לענן נכשלה — השינויים לא נשמרו. נסה שוב.");
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-bold text-slate-600 animate-pulse">טוען...</p>
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



      {showWhatsNew && <WhatsNewModal onDismiss={handleDismissWhatsNew} />}

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
