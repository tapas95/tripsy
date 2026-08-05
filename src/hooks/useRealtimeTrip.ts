/**
 * useRealtimeTrip — Supabase Realtime subscription for a single trip.
 *
 * Subscribes to postgres_changes on:
 *   • expenses          → invalidates ['expenses', tripId]
 *   • expense_splits    → invalidates ['expenses', tripId]
 *   • settlements       → invalidates ['settlements', tripId] + ['expenses', tripId]
 *
 * WHY the instanceId pattern: supabase.channel(name) returns the *same cached
 * object* if a channel with that name already exists in the client's registry.
 * In React StrictMode, effects run twice (mount → unmount → remount). The
 * cleanup's removeChannel() is async inside Supabase, so by the time the second
 * mount fires the old channel may still be registered — calling .on() on an
 * already-subscribed channel throws "cannot add postgres_changes callbacks after
 * subscribe()". A unique name per mount guarantees a fresh channel every time.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { sendLocalNotification } from '../utils/notifications';

export const useRealtimeTrip = (tripId: string | undefined) => {
  const queryClient = useQueryClient();
  // Stable random suffix that is created once per hook instance (not per render).
  // useRef never causes a re-render, so this is safe inside effects.
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    if (!tripId) return;

    // Channel name is unique per mount: even if the same tripId is re-mounted
    // rapidly (StrictMode), each mount gets its own name and therefore its own
    // fresh channel object.
    const channelName = `trip-sync:${tripId}:${instanceId.current}`;

    const channel = supabase
      .channel(channelName)
      // ── expenses ──────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
          queryClient.invalidateQueries({ queryKey: ['settlements', tripId] });

          if (payload.eventType === 'INSERT') {
            const newExpense = payload.new as any;
            sendLocalNotification(
              'New Expense Added 💸',
              `An expense of ${newExpense.amount ?? ''} was added.`
            );
          }
        }
      )
      // ── expense_splits ────────────────────────────────────────────────────
      // No trip_id column on this table, so we can't server-filter. React Query
      // deduplicates rapid invalidations, so the extra noise is harmless.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_splits',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
        }
      )
      // ── settlements ───────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['settlements', tripId] });
          queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });

          if (payload.eventType === 'INSERT') {
            const settlement = payload.new as any;
            sendLocalNotification(
              'Debt Settled 🤝',
              `A settlement payment of ${settlement.amount ?? ''} was logged.`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);
};
