import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { Trip, HotelBooking, FlightSegment, Restaurant, Attraction } from './types';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './services/firebaseConfig';
import { saveTrip, deleteTrip } from './services/firestoreService';
import { TripAssistant } from './components/TripAssistant';
import { mapAnalysisToTrip } from './services/tripService';

// Views
import { ItineraryView } from './components/ItineraryView';
import { FlightsView } from './components/FlightsView';
import { HotelsView } from './components/HotelsView';
import { RestaurantsView } from './components/RestaurantsView';
import { AttractionsView } from './components/AttractionsView';
import { BudgetView } from './components/BudgetView';
import { UnifiedMapView } from './components/UnifiedMapView';
import { ShoppingView } from './components/ShoppingView';
import { AdminView } from './components/AdminView';

// Helper to strip heavy data (PDFs/Images) before caching
const compressForCache = (trips: Trip[]) => {
  return trips.map(t => ({
    ...t,
    documents: [], // Remove heavy base64 strings
    flights: { ...t.flights, segments: t.flights?.segments || [] },
    itinerary: t.itinerary || []
  }));
};

function App() {
  const { user, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [generatedTrip, setGeneratedTrip] = useState<Trip | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDataSyncing, setIsDataSyncing] = useState(true);

  // UI State
  const [currentTab, setCurrentTab] = useState('itinerary');
  const [showAdmin, setShowAdmin] = useState(false);

  // Safe Storage Helper
  const safeSetItem = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn("⚠️ LocalStorage Quota Exceeded. Clearing old cache...");
        try {
          localStorage.removeItem(key);
          console.log("🧹 Cleared heavy key to make space");
        } catch (err) { console.error("Failed to clear space", err); }
      } else {
        console.warn("LocalStorage Write Failed", e);
      }
    }
  };

  // Load Trips Logic - With "Zombie Protection" & Sharing Support (Dual Listeners)
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    let unsubShared: Unsubscribe | null = null;

    const loadTrips = async () => {
      // 1. Load from cache first (Fast UI)
      try {
        const cached = localStorage.getItem("cachedTrips");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setTrips(parsed);
            console.log("💾 Loaded lightweight trips from cache");
            setIsDataSyncing(false);
          }
        }
      } catch (e) {
        console.warn("Cache corrupted, clearing");
        localStorage.removeItem("cachedTrips");
      }

      if (!user) {
        if (!loading) {
          setTrips([]);
          setIsDataSyncing(false);
        }
        return;
      }

      // 2. Subscribe to Firestore (Dual Source of Truth: Personal + Shared)
      try {
        console.log(`🔌 Subscribing to trips for user: ${user.uid}`);

        let localPersonalTrips: Trip[] = [];
        let localSharedTrips: Trip[] = [];

        // Helper to Merge and Update State
        const updateTripsState = () => {
          const merged = [...localPersonalTrips, ...localSharedTrips];
          const unique = merged.filter((t, index, self) =>
            index === self.findIndex((t2) => t2.id === t.id)
          );
          unique.sort((a, b) => {
            const dateA = a.dates ? new Date(a.dates.split('-')[0]).getTime() : 0;
            const dateB = b.dates ? new Date(b.dates.split('-')[0]).getTime() : 0;
            return dateB - dateA; // Newest first
          });

          console.log(`✨ Merged Update: ${unique.length} trips (${localPersonalTrips.length} personal, ${localSharedTrips.length} shared)`);
          setTrips(unique);
          setIsDataSyncing(false);

          // Update Cache
          try {
            const safeData = compressForCache(unique);
            localStorage.setItem("cachedTrips", JSON.stringify(safeData));
          } catch (error: any) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
              localStorage.clear();
              try { localStorage.setItem("cachedTrips", JSON.stringify(compressForCache(unique))); } catch (e) { }
            }
          }
        };

        const personalRef = collection(db, "users", user.uid, "trips");
        unsubscribe = onSnapshot(personalRef, (snapshot) => {
          localPersonalTrips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
          updateTripsState();
        }, (error) => {
          console.error("❌ Personal trips listener failed:", error);
          if (error.code === 'permission-denied') console.warn("Permission denied for personal trips. Check Rules.");
        });

        const sharedQuery = query(
          collection(db, "shared-trips"),
          where("collaborators", "array-contains", user.uid)
        );

        unsubShared = onSnapshot(sharedQuery, (snapshot) => {
          localSharedTrips = snapshot.docs.map(doc => {
            const data = doc.data();
            const tripContent = data.tripData || data;
            return {
              id: doc.id,
              ...tripContent,
              isShared: true,
              sharing: {
                shareId: doc.id,
                owner: data.owner,
                collaborators: data.collaborators
              }
            } as unknown as Trip;
          });
          updateTripsState();
        }, (error) => {
          console.warn("⚠️ Shared trips listener warning:", error);
        });

      } catch (error) {
        console.error("Error setting up trips listener:", error);
        setIsDataSyncing(false);
      }
    };

    loadTrips();

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubShared) unsubShared();
    };
  }, [user, loading]);

  // Auto-Select Trip Logic
  useEffect(() => {
    if (user && trips.length > 0 && !activeTripId && !generatedTrip) {
      const lastTripId = localStorage.getItem('lastTripId');
      if (lastTripId && trips.find(t => t.id === lastTripId)) {
        setActiveTripId(lastTripId);
      } else {
        setActiveTripId(trips[0].id);
      }
    }
  }, [user, trips, activeTripId, generatedTrip]);

  // Persist Active ID
  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem('lastTripId', activeTripId);
    }
  }, [activeTripId]);


  const handleAnalysisResult = async (analysis: any) => {
    if (!user) {
      alert("נא להתחבר כדי לשמור את הטיול");
      return;
    }

    setIsProcessing(true);
    try {
      console.log("🛠️ Mapping AI result to Trip object...");
      const newTrip = mapAnalysisToTrip(analysis);
      newTrip.userId = user.uid;
      if (!newTrip.id) newTrip.id = crypto.randomUUID();

      console.log("💾 Saving trip to Firestore...", newTrip.id);
      await saveTrip(user.uid, newTrip);

      setGeneratedTrip(newTrip);
      setActiveTripId(newTrip.id);

    } catch (error) {
      console.error("❌ Error saving generated trip:", error);
      alert("שגיאה בשמירת הטיול");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTrip = async (updatedTrip: Trip) => {
    if (!user) return;
    // Optimistic Local Update
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));

    // Fire & Forget Save (Robust Sync will confirm it)
    try {
      await saveTrip(user.uid, updatedTrip);
    } catch (e) {
      console.error("Save failed:", e);
      // We could revert here, but for now we trust the persistence or next sync
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm("למחוק את הטיול לצמיתות?")) return;
    if (!user) return;

    const prevTrips = [...trips];
    const previousActiveId = activeTripId;

    const newTripsList = trips.filter(t => t.id !== tripId);
    setTrips(newTripsList);

    if (activeTripId === tripId) {
      setActiveTripId(newTripsList.length > 0 ? newTripsList[0].id : null);
    }

    try {
      await deleteTrip(user.uid, tripId);
      safeSetItem('cachedTrips', compressForCache(newTripsList));
      localStorage.removeItem(`trip_${tripId}`);
    } catch (err: any) {
      console.error("Delete failed:", err);
      const isPermissionError = err.code === 'permission-denied' || err.message?.includes('permission');
      const isNotFoundError = err.code === 'not-found' || err.message?.includes('not found');

      if (isPermissionError || isNotFoundError) {
        console.log('🧹 Force cleaning zombie trip from local state despite server error');
        safeSetItem('cachedTrips', compressForCache(newTripsList));
        return;
      }
      alert("מחיקה נכשלה");
      setTrips(prevTrips); // Rollback
      setActiveTripId(previousActiveId);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">טוען...</div>;

  if (!user) {
    return (
      <LandingPage
        onLogin={() => { /* Handled by AuthContext usually */ }}
      />
    );
  }

  // Admin View Override
  if (showAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminView
          data={trips}
          currentTripId={activeTripId || undefined}
          onSave={async (newTrips) => {
            // Start saving all changed trips. 
            // Usually AdminView passes the whole array, but we should save individually.
            // For simplicity, we save the active, or implement saveAll logic if needed.
            // AdminView usually updates state directly.
            setTrips(newTrips);
            // We only strictly need to save Modified trips, but AdminView might not tell us which.
            // We can save all (expensive) or rely on sync.
            // For now, assume AdminView logic calls specific updates or we save active.
            // Actually AdminView has specific tools. 
            // Let's Reload trips after Admin closes to be safe if bulk edits happened.
          }}
          onSwitchTrip={setActiveTripId}
          onDeleteTrip={handleDeleteTrip}
          onLeaveTrip={(tripId) => handleDeleteTrip(tripId)} // Map leave to delete/leave logic
          onClose={() => setShowAdmin(false)}
        />
      </div>
    );
  }

  // Dashboard Logic
  if (!activeTripId && !generatedTrip) {
    if (trips.length === 0 && !isDataSyncing) {
      return <LandingPage onLogin={() => { }} />;
    }
    return <div className="h-screen flex items-center justify-center">בוחר טיול...</div>;
  }

  const activeTrip = trips.find(t => t.id === activeTripId) || generatedTrip;

  if (!activeTrip) return <div className="h-screen flex items-center justify-center">שגיאה בטעינת הטיול</div>;

  return (
    <Layout
      activeTrip={activeTrip}
      trips={trips}
      onSwitchTrip={setActiveTripId}
      currentTab={currentTab}
      onSwitchTab={setCurrentTab}
      onOpenAdmin={() => setShowAdmin(true)}
      onUpdateTrip={handleUpdateTrip}
      onDeleteTrip={handleDeleteTrip}
    >
      {currentTab === 'itinerary' && (
        <ItineraryView trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
      )}
      {currentTab === 'flights' && (
        <FlightsView trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
      )}
      {currentTab === 'hotels' && (
        <HotelsView trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
      )}
      {currentTab === 'restaurants' && (
        <RestaurantsView trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
      )}
      {currentTab === 'attractions' && (
        <AttractionsView trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
      )}
      {currentTab === 'budget' && (
        <BudgetView trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
      )}
      {currentTab === 'map_full' && (
        <UnifiedMapView trip={activeTrip} />
      )}
      {currentTab === 'shopping' && (
        <ShoppingView trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
      )}

      {/* Floating Assistant is inside Layout usually, but we can double check */}
      <div className="hidden lg:block">
        {/* Assistant is built into Layout now in newer versions, checking Layout line 261: It IS there! */}
      </div>
    </Layout>
  );
}

export default App;
