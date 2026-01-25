import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { LayoutFixed as Layout } from './components/LayoutFixed';
import { FlightsView } from './components/FlightsView';
import { RestaurantsView } from './components/RestaurantsView';
import { AttractionsView } from './components/AttractionsView';
import { ItineraryView } from './components/ItineraryView';
import { HotelsView } from './components/HotelsView';
import { AdminView } from './components/AdminView';
import { UnifiedMapView } from './components/UnifiedMapView';
import { BudgetView } from './components/BudgetView';
import { ShoppingView } from './components/ShoppingView';
import { loadTrips, saveTrips, saveSingleTrip, deleteTrip } from './services/storageService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Trip } from './types';
import { LandingPage } from './components/LandingPage';

import { initGoogleAuth } from './services/googleAuthService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AppContent: React.FC = () => {
  const { user, signIn, loading: authLoading } = useAuth();

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
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center">
          <span className="text-slate-400 font-bold block mb-4">עדיין אין לך טיולים</span>
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200"
            onClick={() => setShowAdmin(true)} // Open Admin/Wizard to create
          >
            צור טיול חדש
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'flights':
        return <FlightsView trip={activeTrip} />;
      case 'restaurants':
        return <RestaurantsView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
      case 'attractions':
        return <AttractionsView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
      case 'itinerary':
        return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} onSwitchTab={setCurrentTab} />;
      case 'hotels':
        return <HotelsView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
      case 'map_full':
        return <UnifiedMapView trip={activeTrip} title="מפת הטיול המלאה" />;
      case 'budget':
        return <BudgetView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
      case 'shopping':
        return <ShoppingView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} />;
      default:
        return <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdateActiveTrip} onSwitchTab={setCurrentTab} />;
    }
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
        <AdminView
          data={trips}
          onSave={handleSaveAllData}
          onClose={() => setShowAdmin(false)}
        />
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
