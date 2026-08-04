import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { getTripMembers, TripMemberProfile } from '../api/members';
import { supabase } from '../lib/supabase';

export const useTripMembers = (tripId: string) => {
  const queryClient = useQueryClient();
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  // Subscribe to trip_members changes for this trip so the member list updates
  // live when someone joins via invite or is removed by the owner.
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip-members:${tripId}:${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trip_members', tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

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
