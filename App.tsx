import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { LayoutFixed as Layout } from './components/LayoutFixed';
import { loadTrips, saveTrips, saveSingleTrip, deleteTrip } from './services/storageService';
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


import { initGoogleAuth } from './services/googleAuthService';
import { Plus, Compass, Map, Globe, Sparkles } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);

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
        setActiveTripId(loadedTrips[0].id);
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

  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];

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
        setActiveTripId(trips[0].id);
      }
    }
  }, [trips, activeTripId]);

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

    // Optimistic UI update
    const newTrips = trips.filter(t => t.id !== tripId);
    setTrips(newTrips);

    if (activeTripId === tripId && newTrips.length > 0) {
      setActiveTripId(newTrips[0].id);
    }

    try {
      await deleteTrip(tripId, user?.uid);
      console.log('✅ Trip deleted successfully from Firebase');
    } catch (err) {
      console.error('❌ Error deleting trip - REVERTING UI:', err);
      // CRITICAL: Revert UI to prevent zombie data
      setTrips(previousTrips);
      setActiveTripId(previousActiveId);
      // Optionally show error to user
      alert('שגיאה במחיקת הטיול. נסה שוב.');
    }
  };

  // State Cleanup on Logout
  useEffect(() => {
    if (!user && !authLoading) {
      setTrips([]);
      setActiveTripId('');
    }
  }, [user, authLoading]);

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

  if (!activeTrip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-slate-200/50 text-center max-w-md w-full mx-4 border border-slate-100 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200 rotate-3 transform hover:rotate-0 transition-transform duration-500">
            <Compass className="w-12 h-12 text-white animate-spin-slow" />
          </div>

          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">ההרפתקה הבאה שלך מחכה</h1>
          <p className="text-slate-500 mb-10 text-lg leading-relaxed">
            עדיין לא נוצרו טיולים. זה הזמן לתכנן את החופשה המושלמת בעזרת ה-AI שלנו.
          </p>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
            onClick={() => setShowAdmin(true)}
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            צור טיול חדש
          </button>

          <div className="mt-10 pt-8 border-t border-slate-50 flex justify-between gap-4 grayscale opacity-40">
            <div className="flex flex-col items-center gap-1">
              <Globe className="w-6 h-6" />
              <span className="text-[10px] uppercase font-black tracking-widest">Global</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Map className="w-6 h-6" />
              <span className="text-[10px] uppercase font-black tracking-widest">Smart</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-6 h-6" />
              <span className="text-[10px] uppercase font-black tracking-widest">AI Power</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
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

      {showAdmin && (
        <React.Suspense fallback={null}>
          <AdminView
            data={trips}
            onSave={handleSaveAllData}
            onDeleteTrip={handleDeleteTrip}
            onClose={() => setShowAdmin(false)}
          />
        </React.Suspense>
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
