
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadTrips, deleteTrip, leaveTrip, saveSingleTrip } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { Trip } from '../types';
import { useTripStore } from '../stores/useTripStore';

// Query Key Factory
const TRIP_KEYS = {
        all: ['trips'] as const,
        lists: () => [...TRIP_KEYS.all, 'list'] as const,
        detail: (id: string) => [...TRIP_KEYS.all, 'detail', id] as const,
};

export const useTrips = () => {
        const { user } = useAuth();
        const queryClient = useQueryClient();
        const { activeTripId, setActiveTripId } = useTripStore();

        const query = useQuery({
                queryKey: TRIP_KEYS.lists(),
                queryFn: async () => {
                        if (!user) return [];
                        return await loadTrips(user.uid, user.email || undefined);
                },
                enabled: !!user,
                staleTime: 1000 * 60 * 5, // 5 min
        });

        // activeTrip is derived from the list, not a separate fetch (usually)
        const activeTrip = query.data?.find((t) => t.id === activeTripId) || query.data?.[0] || null;

        return {
                trips: query.data || [],
                isLoading: query.isLoading,
                error: query.error,
                activeTrip,
                refetch: query.refetch
        };
};

export const useTripMutations = () => {
        const { user } = useAuth();
        const queryClient = useQueryClient();
        const { activeTripId, setActiveTripId, setProcessingTripId } = useTripStore();

        const deleteTripMutation = useMutation({
                mutationFn: async (tripId: string) => {
                        const trips = queryClient.getQueryData<Trip[]>(TRIP_KEYS.lists()) || [];
                        const tripToDelete = trips.find(t => t.id === tripId);
                        const shareId = tripToDelete?.isShared && tripToDelete?.sharing?.shareId ? tripToDelete.sharing.shareId : undefined;
                        await deleteTrip(tripId, user?.uid, shareId);
                        return tripId;
                },
                onMutate: async (tripId) => {
                        await queryClient.cancelQueries({ queryKey: TRIP_KEYS.lists() });
                        const previousTrips = queryClient.getQueryData<Trip[]>(TRIP_KEYS.lists());

                        // Optimistic Update
                        queryClient.setQueryData<Trip[]>(TRIP_KEYS.lists(), (old) => old?.filter(t => t.id !== tripId) || []);

                        setProcessingTripId(tripId); // Lock
                        return { previousTrips };
                },
                onError: (err, newTodo, context) => {
                        queryClient.setQueryData(TRIP_KEYS.lists(), context?.previousTrips);
                        setProcessingTripId(null); // Unlock
                },
                onSuccess: (deletedId) => {
                        // Switch active trip if needed
                        const currentTrips = queryClient.getQueryData<Trip[]>(TRIP_KEYS.lists()) || [];
                        if (activeTripId === deletedId) {
                                setActiveTripId(currentTrips.length > 0 ? currentTrips[0].id : '');
                        }
                },
                onSettled: () => {
                        queryClient.invalidateQueries({ queryKey: TRIP_KEYS.lists() });
                        setProcessingTripId(null);
                }
        });

        const leaveTripMutation = useMutation({
                mutationFn: async ({ tripId, shareId }: { tripId: string, shareId: string }) => {
                        await leaveTrip(tripId, shareId, user?.uid);
                        return tripId;
                },
                onMutate: async ({ tripId }) => {
                        await queryClient.cancelQueries({ queryKey: TRIP_KEYS.lists() });
                        const previousTrips = queryClient.getQueryData<Trip[]>(TRIP_KEYS.lists());
                        queryClient.setQueryData<Trip[]>(TRIP_KEYS.lists(), (old) => old?.filter(t => t.id !== tripId) || []);
                        setProcessingTripId(tripId);
                        return { previousTrips };
                },
                onError: (err, vars, context) => {
                        queryClient.setQueryData(TRIP_KEYS.lists(), context?.previousTrips);
                        setProcessingTripId(null);
                },
                onSuccess: (leftId) => {
                        const currentTrips = queryClient.getQueryData<Trip[]>(TRIP_KEYS.lists()) || [];
                        if (activeTripId === leftId) {
                                setActiveTripId(currentTrips.length > 0 ? currentTrips[0].id : '');
                        }
                },
                onSettled: () => {
                        queryClient.invalidateQueries({ queryKey: TRIP_KEYS.lists() });
                        setProcessingTripId(null);
                }
        });

        const updateTripMutation = useMutation({
                mutationFn: async (updatedTrip: Trip) => {
                        await saveSingleTrip(updatedTrip, user?.uid);
                        return updatedTrip;
                },
                onMutate: async (newTrip) => {
                        await queryClient.cancelQueries({ queryKey: TRIP_KEYS.lists() });
                        const previousTrips = queryClient.getQueryData<Trip[]>(TRIP_KEYS.lists());
                        queryClient.setQueryData<Trip[]>(TRIP_KEYS.lists(), (old) => old?.map(t => t.id === newTrip.id ? newTrip : t) || []);
                        return { previousTrips };
                },
                onError: (err, newTrip, context) => {
                        queryClient.setQueryData(TRIP_KEYS.lists(), context?.previousTrips);
                },
                onSettled: () => {
                        queryClient.invalidateQueries({ queryKey: TRIP_KEYS.lists() });
                }
        });

        return { deleteTripMutation, leaveTripMutation, updateTripMutation };
}
