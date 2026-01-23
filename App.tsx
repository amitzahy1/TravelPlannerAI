import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
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

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
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
      if (loadedTrips.length > 0) {
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
    if (trips.length > 0 && !trips.find(t => t.id === activeTripId)) {
        setActiveTripId(trips[0].id);
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

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="text-gray-600">טוען נתונים...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-500 text-lg">{error}</div>
        <button 
          onClick={loadUserTrips}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <span className="text-gray-600">אין טיולים זמינים</span>
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
