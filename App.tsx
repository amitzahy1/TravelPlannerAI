
import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { LayoutFixed as Layout } from './components/LayoutFixed';
import { saveTrips, saveSingleTrip } from './services/storageService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Trip } from './types';
import { LandingPage } from './components/LandingPage';
import { UnifiedMapView } from './components/UnifiedMapView';
import { useTrips, useTripMutations } from './hooks/useTrips';
import { useTripStore } from './stores/useTripStore';

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
import { OnboardingModal } from './components/OnboardingModal';

// --- MAIN APP CONTENT (Decoupled) ---
const AppContent: React.FC = () => {
  const { user, signIn, loading: authLoading } = useAuth();

  // New Architecture Hooks
  const { trips, isLoading, error, activeTrip } = useTrips();
  const { deleteTripMutation, leaveTripMutation, updateTripMutation } = useTripMutations();
  const { setActiveTripId, activeTripId } = useTripStore();

  // Local UI State
  const [currentTab, setCurrentTab] = useState('itinerary');
  const [showAdmin, setShowAdmin] = useState(false);
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
      }
    }
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
    if (!isLoading && !authLoading && trips.length === 0 && !joinShareId) {
      setShowOnboarding(true);
    }
  }, [isLoading, authLoading, trips.length, joinShareId]);

  // Loading State
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="text-slate-500 font-medium animate-pulse">Loading Profile...</span>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return <LandingPage onLogin={signIn} />;
  }

  // Loading Data
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="text-gray-500 font-medium">טוען את הטיולים שלך...</span>
      </div>
    );
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

  const renderContent = () => {
    if (!activeTrip) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <p>בחר טיול מהתפריט או צור טיול חדש</p>
        </div>
      );
    }

    const handleUpdate = (updatedTrip: Trip) => updateTripMutation.mutate(updatedTrip);

    return (
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      }>
        {(() => {
          switch (currentTab) {
            case 'flights': return <FlightsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'restaurants': return <RestaurantsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'attractions': return <AttractionsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'itinerary': return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdate} onSwitchTab={setCurrentTab} onRefresh={() => { }} />;
            case 'hotels': return <HotelsView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'map_full': return <UnifiedMapView trip={activeTrip} title="מפת הטיול המלאה" />;
            case 'budget': return <BudgetView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            case 'shopping': return <ShoppingView trip={activeTrip} onUpdateTrip={handleUpdate} />;
            default: return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdate} onSwitchTab={setCurrentTab} />;
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
        onUpdateTrip={(t) => updateTripMutation.mutate(t)}
        onDeleteTrip={(id) => deleteTripMutation.mutate(id)}
      >
        {renderContent()}
      </Layout>

      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onImportTrip={(newTrip) => {
            // Optimistic add handled by Refetch or manual QueryClient update if needed
            // Ideally we save it, then the query refreshes.
            saveTrips([...trips, newTrip], user?.uid).then(() => {
              setActiveTripId(newTrip.id);
              setShowOnboarding(false);
              // Force refetch handled by react-query stale time or invalidation
              queryClient.invalidateQueries({ queryKey: ['trips'] });
            });
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
            saveTrips([...trips, newTrip], user?.uid).then(() => {
              setActiveTripId(newTrip.id);
              setShowOnboarding(false);
              queryClient.invalidateQueries({ queryKey: ['trips'] });
            });
          }}
        />
      )}

      {showAdmin && (
        <React.Suspense fallback={null}>
          <AdminView
            data={trips}
            currentTripId={activeTripId}
            onSave={(newTrips) => saveTrips(newTrips, user?.uid).then(() => queryClient.invalidateQueries({ queryKey: ['trips'] }))}
            onSwitchTrip={setActiveTripId}
            onDeleteTrip={(id) => deleteTripMutation.mutate(id)}
            onLeaveTrip={(id) => {
              const trip = trips.find(t => t.id === id);
              if (trip?.sharing?.shareId) {
                leaveTripMutation.mutate({ tripId: id, shareId: trip.sharing.shareId });
              }
            }}
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
            saveSingleTrip(newTrip, user?.uid).then(() => {
              setActiveTripId(newTrip.id);
              queryClient.invalidateQueries({ queryKey: ['trips'] }); // Refresh list
            });
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
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;

