import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { Trip } from './types';
import { collection, query, where, onSnapshot, Unsubscribe, or, and } from 'firebase/firestore';
import { db } from './services/firebaseConfig';
import { saveTrip, deleteTrip } from './services/firestoreService';
import { TripAssistant } from './components/TripAssistant';
import { analyzeTripFiles } from './services/aiService';
import { mapAnalysisToTrip } from './services/tripService';

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
  // Add explicit loading state for data sync
  const [isDataSyncing, setIsDataSyncing] = useState(true);

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

  // Load Trips Logic - With "Zombie Protection" & Sharing Support
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const loadTrips = async () => {
      // 1. Load from cache first (Fast UI)
      try {
        const cached = localStorage.getItem("cachedTrips");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setTrips(parsed);
            console.log("💾 Loaded lightweight trips from cache");
            setIsDataSyncing(false); // Show cached data immediately
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

      // 2. Subscribe to Firestore (Source of Truth)
      try {
        console.log(`🔌 Subscribing to trips for user: ${user.uid}`);

        // QUERY UPGRADE: Support both OWNED trips and SHARED trips
        const q = query(
          collection(db, "trips"),
          or(
            where("userId", "==", user.uid),
            where("sharing.collaborators", "array-contains", user.uid)
          )
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const freshTrips = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Trip[];

          console.log(`🔥 Firestore Update: ${freshTrips.length} trips.`);

          setTrips(freshTrips);
          setIsDataSyncing(false);

          // 3. Save to Cache (Safe Mode)
          try {
            const safeData = compressForCache(freshTrips);
            localStorage.setItem("cachedTrips", JSON.stringify(safeData));
          } catch (error: any) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
              console.warn("⚠️ LocalStorage full. Clearing to save new state.");
              localStorage.clear();
              // Try one more time strictly for this payload
              try { localStorage.setItem("cachedTrips", JSON.stringify(compressForCache(freshTrips))); } catch (e) { }
            }
          }
        });

      } catch (error) {
        console.error("Error setting up trips listener:", error);
        setIsDataSyncing(false);
      }
    };

    loadTrips();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, loading]);

  const handleAnalysisResult = async (analysis: any) => {
    if (!user) {
      alert("נא להתחבר כדי לשמור את הטיול");
      return;
    }

    setIsProcessing(true);
    try {
      console.log("🛠️ Mapping AI result to Trip object...");
      const newTrip = mapAnalysisToTrip(analysis);

      // Critical: Ensure User ID is attached
      newTrip.userId = user.uid;
      if (!newTrip.id) newTrip.id = crypto.randomUUID();

      console.log("💾 Saving trip to Firestore...", newTrip.id);
      await saveTrip(newTrip);

      setGeneratedTrip(newTrip);
      // Note: onSnapshot will catch the new trip automatically

    } catch (error) {
      console.error("❌ Error saving generated trip:", error);
      alert("שגיאה בשמירת הטיול");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveGeneratedTrip = () => {
    if (generatedTrip) {
      setActiveTripId(generatedTrip.id);
      setGeneratedTrip(null);
    }
  };

  // Track processing to prevent race conditions
  const [processingTripId, setProcessingTripId] = useState<string | null>(null);

  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm("למחוק את הטיול לצמיתות?")) return;

    // Optimistic Update (Immediate UI response)
    const prevTrips = [...trips];
    const previousActiveId = activeTripId;

    // Store new state locally
    const newTripsList = trips.filter(t => t.id !== tripId);
    setTrips(newTripsList);

    if (activeTripId === tripId) {
      setActiveTripId(newTripsList.length > 0 ? newTripsList[0].id : null);
    }

    setProcessingTripId(tripId);

    try {
      await deleteTrip(tripId);

      // Update persistent cache immediately to prevent zombie return on refresh
      safeSetItem('cachedTrips', compressForCache(newTripsList));
      localStorage.removeItem(`trip_${tripId}`);

    } catch (err: any) {
      console.error("Delete failed:", err);

      // ZOMBIE FIX: If server says "not found" or "permission denied", treat as deleted locally
      const isPermissionError = err.code === 'permission-denied' || err.message?.includes('permission');
      const isNotFoundError = err.code === 'not-found' || err.message?.includes('not found');

      if (isPermissionError || isNotFoundError) {
        console.log('🧹 Force cleaning zombie trip from local state despite server error');
        safeSetItem('cachedTrips', compressForCache(newTripsList));
        setProcessingTripId(null);
        return;
      }

      alert("מחיקה נכשלה");
      setTrips(prevTrips); // Rollback
      setActiveTripId(previousActiveId);
    } finally {
      setProcessingTripId(null);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">טוען...</div>;

  if (!user || (!activeTripId && !generatedTrip)) {
    return (
      <>
        <LandingPage
          onLogin={() => { }}
          onTripGenerated={handleAnalysisResult}
          isProcessing={isProcessing}
          user={user}
          existingTrips={trips}
          onSelectTrip={setActiveTripId}
          onDeleteTrip={handleDeleteTrip}
        />
        {generatedTrip && (
          <TripAssistant
            trip={generatedTrip}
            onSave={handleSaveGeneratedTrip}
            onClose={() => setGeneratedTrip(null)}
            isInitialView={true}
          />
        )}
      </>
    );
  }

  const activeTrip = trips.find(t => t.id === activeTripId) || generatedTrip;

  return (
    <Layout
      activeTripId={activeTripId}
      trips={trips}
      onSwitchTrip={setActiveTripId}
      onNewTrip={() => setActiveTripId(null)}
    >
      {activeTrip && (
        <TripAssistant
          trip={activeTrip}
          onSave={async (updatedTrip) => {
            // Optimistic update
            setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
            await saveTrip(updatedTrip);
          }}
          onClose={() => setActiveTripId(null)}
        />
      )}
    </Layout>
  );
}

export default App;
