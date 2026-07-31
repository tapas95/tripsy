import { useQuery } from '@tanstack/react-query';
import { getTripMembers, TripMemberProfile } from '../api/members';

export const useTripMembers = (tripId: string) => {
  const query = useQuery<TripMemberProfile[]>({
    queryKey: ['trip_members', tripId],
    queryFn: () => getTripMembers(tripId),
    enabled: !!tripId,
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
