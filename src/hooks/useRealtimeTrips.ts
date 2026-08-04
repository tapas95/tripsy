/**
 * useRealtimeTrips — Supabase Realtime subscription for the trips list.
 *
 * Subscribes to:
 *   • trip_members (filtered to current user) → invalidates ['trips', userId]
 *   • trips UPDATE                            → invalidates ['trips', userId]
 *
 * WHY the instanceId pattern: see useRealtimeTrip.ts for the full explanation.
 * Short version: supabase.channel() caches by name, React StrictMode mounts
 * effects twice, and calling .on() on an already-subscribed channel throws.
 * A unique name per mount avoids the collision entirely.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useRealtimeTrips = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    if (!userId) return;

    const channelName = `trips-list:${userId}:${instanceId.current}`;

    const channel = supabase
      .channel(channelName)
      // Fires when the current user joins or leaves a trip (invite code flow,
      // owner removing a member, etc.).
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trips', userId] });
        }
      )
      // Fires when a trip is renamed or its dates/currency change.
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trips', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};
