import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserTrips, createTrip, joinTripByCode, TripWithRole } from '../api/trips';
import { useAuth } from './useAuth';

export const useTrips = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tripsQuery = useQuery<TripWithRole[]>({
    queryKey: ['trips', user?.id],
    queryFn: () => (user ? getUserTrips(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const createTripMutation = useMutation({
    mutationFn: (data: {
      name: string;
      startDate?: string;
      endDate?: string;
      currency?: string;
    }) => {
      if (!user) throw new Error('User not authenticated.');
      return createTrip({ ...data, userId: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', user?.id] });
    },
  });

  const joinTripMutation = useMutation({
    mutationFn: (inviteCode: string) => {
      if (!user) throw new Error('User not authenticated.');
      return joinTripByCode(inviteCode, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', user?.id] });
    },
  });

  return {
    trips: tripsQuery.data || [],
    isLoading: tripsQuery.isLoading,
    isError: tripsQuery.isError,
    error: tripsQuery.error,
    refetch: tripsQuery.refetch,
    createTrip: createTripMutation.mutateAsync,
    isCreating: createTripMutation.isPending,
    joinTrip: joinTripMutation.mutateAsync,
    isJoining: joinTripMutation.isPending,
  };
};
