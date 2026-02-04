
import { create } from 'zustand';
import { Trip } from '../types';

interface TripStore {
        // State
        activeTripId: string;
        processingTripId: string | null; // Guard against race conditions

        // Actions
        setActiveTripId: (id: string | ((prev: string) => string)) => void;
        setProcessingTripId: (id: string | null) => void;
}

export const useTripStore = create<TripStore>((set) => ({
        activeTripId: localStorage.getItem('lastTripId') || '',
        processingTripId: null,

        setActiveTripId: (input) => set((state) => {
                const nextId = typeof input === 'function' ? input(state.activeTripId) : input;
                localStorage.setItem('lastTripId', nextId);
                return { activeTripId: nextId };
        }),

        setProcessingTripId: (id) => set({ processingTripId: id }),
}));
