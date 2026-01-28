import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { LayoutFixed as Layout } from './components/LayoutFixed';
import { loadTrips, saveTrips, saveSingleTrip, deleteTrip, leaveTrip } from './services/storageService';
import { subscribeToSharedTrip } from './services/firestoreService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Trip } from './types';
import { LandingPage } from './components/LandingPage';
import { UnifiedMapView } from './components/UnifiedMapView'; // Keep generic map eager or lazy? usually lazy if big.
// Lazy Load Heavy Views
const FlightsView = React.lazy(() => import('./components/FlightsView').then(module => ({ default: module.FlightsView })));
const RestaurantsView = React.lazy(() => import('./components/RestaurantsView').then(module => ({ default: module.RestaurantsView })));
const AttractionsView = React.lazy(() => import('./components/AttractionsView').then(module => ({ default: module.AttractionsView })));
const ItineraryView = React.lazy(() => import('./components/ItineraryView').then(module => ({ default: module.ItineraryView })));
const HotelsView = React.lazy(() => import('./components/HotelsView').then(module => ({ default: module.HotelsView })));
const AdminView = React.lazy(() => import('./components/AdminView').then(module => ({ default: module.AdminView })));

const BudgetView = React.lazy(() => import('./components/BudgetView').then(module => ({ default: module.BudgetView })));
const ShoppingView = React.lazy(() => import('./components/ShoppingView').then(module => ({ default: module.ShoppingView })));
import { JoinTripModal } from './components/JoinTripModal';
import { AIChatOverlay } from './components/AIChatOverlay';


import { initGoogleAuth } from './services/googleAuthService';
import { Plus, Compass, Map, Globe, Sparkles } from 'lucide-react';
import { OnboardingModal } from './components/OnboardingModal';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AppContent: React.FC = () => {
  const { user, signIn, loading: authLoading } = useAuth();

  /* 
  useEffect(() => {
    if (CLIENT_ID && !authLoading) {
      const interval = setInterval(() => {
        // @ts-ignore
        if (window.google) {
          initGoogleAuth(CLIENT_ID);
          clearInterval(interval);
        }
      }, 500);
    }
  }, [authLoading]);
  */

  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>('');
  const [currentTab, setCurrentTab] = useState('itinerary');
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Guard against race conditions during critical ops (delete/leave)
  const [processingTripId, setProcessingTripId] = useState<string | null>(null);


  const [error, setError] = useState<string | null>(null);
  const [joinShareId, setJoinShareId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Deep Link Handling
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/join/')) {
      const shareId = hash.replace('#/join/', '');
      if (shareId) {
        console.log("🔗 Detected Join Link:", shareId);
        setJoinShareId(shareId);
        // Clean URL after detection to prevent re-triggering? maybe keep it until joined?
        // window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Load trips when user changes
  const loadUserTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedTrips = await loadTrips(user?.uid);
      setTrips(loadedTrips);

      // Persistence Logic: Load last used trip
      const lastTripId = localStorage.getItem('lastTripId');
      if (lastTripId && loadedTrips.find(t => t.id === lastTripId)) {
        setActiveTripId(lastTripId);
      } else if (loadedTrips.length > 0) {
        // Default to the NEWEST trip (last in array) if no history
        setActiveTripId(loadedTrips[loadedTrips.length - 1].id);
      }
    } catch (err) {
      console.error('Error loading trips:', err);
      setError('שגיאה בטעינת הנתונים. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!authLoading) {
      loadUserTrips();
    }
  }, [authLoading, loadUserTrips]);

  const activeTrip = trips.find(t => t.id === activeTripId) || trips[trips.length - 1] || null;

  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem('lastTripId', activeTripId);
    }
  }, [activeTripId]);

  useEffect(() => {
    if (trips.length > 0 && !trips.find(t => t.id === activeTripId)) {
      const lastTripId = localStorage.getItem('lastTripId');
      if (lastTripId && trips.find(t => t.id === lastTripId)) {
        setActiveTripId(lastTripId);
      } else {
        // Default to the NEWEST trip
        setActiveTripId(trips[trips.length - 1].id);
      }
    }
  }, [trips, activeTripId]);

  // Real-Time Sync Hook (Project Genesis 2.0)
  useEffect(() => {
    // Safety check: Ensure activeTrip actually exists in the current trips list
    // AND is not currently being processed (deleted/left)
    const isValidTrip = trips.some(t => t.id === activeTrip?.id);
    const isProcessing = activeTrip?.id === processingTripId;

    if (activeTrip && activeTrip.isShared && activeTrip.sharing?.shareId && isValidTrip && !isProcessing) {

      console.log("🔌 Subscribing to shared trip:", activeTrip.name);
      const unsubscribe = subscribeToSharedTrip(activeTrip.sharing.shareId, (updatedTrip) => {
        console.log("⚡ Real-time update received for:", updatedTrip.name);
        setTrips(prev => prev.map(t => t.id === updatedTrip.id ? { ...updatedTrip, isShared: true, sharing: activeTrip.sharing } : t));
      });
      return () => unsubscribe();
    }
  }, [activeTrip?.id, activeTrip?.isShared, activeTrip?.sharing?.shareId, trips.length, processingTripId]); // Added trips.length as dependency to re-eval validity



  const handleUpdateActiveTrip = async (updatedTrip: Trip) => {
    const newTrips = trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
    setTrips(newTrips);

    try {
      await saveSingleTrip(updatedTrip, user?.uid);
    } catch (err) {
      console.error('Error saving trip:', err);
    }
  };

  const handleSaveAllData = async (newTrips: Trip[]) => {
    setTrips(newTrips);
    try {
      await saveTrips(newTrips, user?.uid);
    } catch (err) {
      console.error('Error saving all trips:', err);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    // Store previous state for rollback
    const previousTrips = [...trips];
    const previousActiveId = activeTripId;

    setProcessingTripId(tripId); // 🛡️ BLOCK SUBSCRIPTIONS

    // Optimistic UI update
    const newTrips = trips.filter(t => t.id !== tripId);
    setTrips(newTrips);

    if (activeTripId === tripId) {
      setActiveTripId(newTrips.length > 0 ? newTrips[0].id : '');
    }

    try {
      const tripToDelete = trips.find(t => t.id === tripId);
      const shareId = tripToDelete?.isShared && tripToDelete?.sharing?.shareId ? tripToDelete.sharing.shareId : undefined;

      await deleteTrip(tripId, user?.uid, shareId);
      console.log('✅ Trip deleted successfully from Firebase');
    } catch (err) {
      console.error('❌ Error deleting trip - REVERTING UI:', err);
      // CRITICAL: Revert UI to prevent zombie data
      setTrips(previousTrips);
      setActiveTripId(previousActiveId);
      // Optionally show error to user
      alert('שגיאה במחיקת הטיול. נסה שוב.');
    } finally {
      setProcessingTripId(null); // 🔓 RELEASE GUARD
    }
  };


  const handleLeaveTrip = async (tripId: string) => {
    if (!activeTrip?.isShared || !activeTrip?.sharing?.shareId) return;

    setProcessingTripId(tripId); // 🛡️ BLOCK SUBSCRIPTIONS

    // Harmonious UX: Optimistic Update
    const previousTrips = [...trips];
    const newTrips = trips.filter(t => t.id !== tripId);
    setTrips(newTrips);

    // Switch active trip if needed
    if (activeTripId === tripId) {
      setActiveTripId(newTrips.length > 0 ? newTrips[0].id : '');
    }

    try {
      await leaveTrip(tripId, activeTrip.sharing.shareId, user?.uid);
    } catch (err) {
      console.error('Failed to leave trip', err);
      setTrips(previousTrips); // Revert
      alert('שגיאה ביציאה מהטיול');
    } finally {
      setProcessingTripId(null); // 🔓 RELEASE GUARD
    }
  };


  // State Cleanup on Logout
  useEffect(() => {
    if (!user && !authLoading) {
      setTrips([]);
      setActiveTripId('');
    }
  }, [user, authLoading]);

  // Auto-Open Onboarding if no trips (First Time Experience)
  useEffect(() => {
    if (!isLoading && !authLoading && trips.length === 0 && !joinShareId) {
      setShowOnboarding(true);
    }
  }, [isLoading, authLoading, trips.length, joinShareId]);

  // STRICT RENDER GUARD

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="text-slate-500 font-medium animate-pulse">Loading Profile...</span>
      </div>
    );
  }

  // 2. Not Logged In (Landing Page)
  if (!user) {
    // Premium Landing Page
    return <LandingPage onLogin={signIn} />;
  }

  // 3. Logged In (Loading Data)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="text-gray-500 font-medium">טוען את הטיולים שלך...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-500 text-lg font-bold">{error}</div>
        <button
          onClick={loadUserTrips}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  const renderContent = () => {
    if (!activeTrip) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <p>בחר טיול מהתפריט או צור טיול חדש</p>
        </div>
      );
    }

    return (
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-sm text-slate-400 mt-2">טוען רכיב...</span>
        </div>
      }>
        {(() => {
          switch (currentTab) {
            case 'flights': return <FlightsView trip={activeTrip} />;
            case 'restaurants': return <RestaurantsView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
            case 'attractions': return <AttractionsView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
            case 'itinerary': return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} onSwitchTab={setCurrentTab} />;
            case 'hotels': return <HotelsView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
            case 'map_full': return <UnifiedMapView trip={activeTrip} title="מפת הטיול המלאה" />;
            case 'budget': return <BudgetView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
            case 'shopping': return <ShoppingView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
            default: return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} onSwitchTab={setCurrentTab} />;
          }
        })()}
      </React.Suspense>
    );
  };

  return (
    <HashRouter>
      <Layout
        activeTrip={activeTrip}
        trips={trips}
        onSwitchTrip={setActiveTripId}
        currentTab={currentTab}
        onSwitchTab={setCurrentTab}
        onOpenAdmin={() => setShowAdmin(true)}
        onUpdateTrip={handleUpdateActiveTrip}
        onDeleteTrip={handleDeleteTrip}
      >
        {renderContent()}
      </Layout>

      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onImportTrip={(newTrip) => {
            const updatedTrips = [...trips, newTrip];
            setTrips(updatedTrips);
            setActiveTripId(newTrip.id);
            saveTrips(updatedTrips, user?.uid);
            setShowOnboarding(false);
          }}
          onCreateNew={() => {
            const newTrip: Trip = {
              id: crypto.randomUUID(),
              name: "New Trip",
              dates: "",
              destination: "",
              coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
              flights: { passengerName: "", pnr: "", segments: [] },
              hotels: [],
              restaurants: [],
              attractions: [],
              itinerary: [],
              documents: [],
              secureNotes: [],
              isShared: false
            };
            const updatedTrips = [...trips, newTrip];
            setTrips(updatedTrips);
            setActiveTripId(newTrip.id);
            saveTrips(updatedTrips, user?.uid);
            setShowOnboarding(false);
          }}
        />
      )}

      {showAdmin && (
        <React.Suspense fallback={null}>
          <AdminView
            data={trips}
            currentTripId={activeTripId}
            onSave={handleSaveAllData}
            onSwitchTrip={setActiveTripId}
            onDeleteTrip={handleDeleteTrip}
            onLeaveTrip={handleLeaveTrip}
            onClose={() => setShowAdmin(false)}
          />
        </React.Suspense>
      )}

      {joinShareId && (
        <JoinTripModal
          shareId={joinShareId}
          onClose={() => {
            setJoinShareId(null);
            window.history.replaceState(null, '', window.location.pathname);
          }}
          onJoinSuccess={(newTrip) => {
            setJoinShareId(null);
            setTrips(prev => [...prev, newTrip]);
            setActiveTripId(newTrip.id);
            saveSingleTrip(newTrip, user?.uid); // Save immediately
            window.history.replaceState(null, '', window.location.pathname);
          }}
        />
      )}

      {activeTrip && (
        <AIChatOverlay trip={activeTrip} />
      )}
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
