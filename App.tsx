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

import { initGoogleAuth } from './services/googleAuthService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

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
      // Optionally show error to user
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
    const newTrips = trips.filter(t => t.id !== tripId);
    setTrips(newTrips);

    if (activeTripId === tripId && newTrips.length > 0) {
      setActiveTripId(newTrips[0].id);
    }

    try {
      await deleteTrip(tripId, user?.uid);
    } catch (err) {
      console.error('Error deleting trip:', err);
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
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        {/* Using inline spinner as ThinkingLoader might not be fully compatible or imported yet */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="text-gray-500 font-medium animate-pulse">טוען משתמש...</span>
      </div>
    );
  }

  // 2. Not Logged In (Landing View)
  if (!user) {
    return (
      <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-slate-100/50"></div>

        <div className="relative z-10 bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/50 text-center max-w-md mx-4 animate-fade-in-up">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 rotate-3 transform hover:rotate-6 transition-transform">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Travel Planner Pro</h1>
          <p className="text-slate-500 mb-8 px-4 leading-relaxed">
            התכנון החכם לטיול הבא שלך. נהל את כל הפרטים במקום אחד, בקלות ובנוחות.
          </p>

          <div className="flex justify-center">
            {/* Implicitly using LoginButton via a wrapper or direct if imported. 
                    Since LoginButton component exists, we should use it. 
                    However, wrapping imports requires top-level changes. 
                    To be safe and "Simple", I'll put a direct Login Button or message here 
                    IF I can't easily import LoginButton without breaking the file structure (imports are at top).
                    
                    Wait, I can add imports at the top! 
                    But I am replacing a chunk. I need to make sure I added the import.
                    My current ReplacementContent is mostly the RETURN block.
                    I didn't add the import to the top of the file in THIS chunk.
                    
                    I will assume for this chunk that I need to provide the UI manually 
                    OR I will do a multi-replace to add the import.
                    
                    Let's do a multi-replace to be safe and clean.
                */}
            <button className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <span>התחבר למערכת</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            שימוש במערכת מחייב התחברות
          </p>
        </div>
      </div>
    );
  }

  // 3. Logged In (Loading Data)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
