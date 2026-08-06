import { supabase } from '../lib/supabase';
import { Trip } from '../types/database';
import { generateUUID } from '../utils/uuid';

export interface TripWithRole extends Trip {
  role: 'owner' | 'member';
  memberCount?: number;
}

export const getUserTrips = async (userId: string): Promise<TripWithRole[]> => {
  const { data: memberRows, error: memberError } = await supabase
    .from('trip_members')
    .select('trip_id, role, trips(*)')
    .eq('user_id', userId);

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (!memberRows) return [];

  return (memberRows as any[])
    .filter((row) => row.trips !== null)
    .map((row) => ({
      ...row.trips,
      role: row.role,
    }));
};

export const createTrip = async (tripData: {
  name: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  userId: string;
}): Promise<Trip> => {
  const tripId = generateUUID();

  // 1. Insert trip with client-side UUID
  const { error: tripError } = await (supabase.from('trips') as any).insert({
    id: tripId,
    name: tripData.name.trim(),
    start_date: tripData.startDate || null,
    end_date: tripData.endDate || null,
    currency: tripData.currency || 'INR',
    created_by: tripData.userId,
  });

  if (tripError) {
    throw new Error(tripError.message);
  }

  // 2. Add creator to trip_members as owner
  const { error: memberError } = await (supabase.from('trip_members') as any).insert({
    trip_id: tripId,
    user_id: tripData.userId,
    role: 'owner',
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  // 3. Fetch created trip (now permitted by RLS is_trip_member policy)
  const { data: trip, error: selectError } = await (supabase.from('trips') as any)
    .select('*')
    .eq('id', tripId)
    .single();

  if (selectError || !trip) {
    throw new Error(selectError?.message || 'Failed to retrieve newly created trip.');
  }

  return trip as Trip;
};

export const joinTripByCode = async (inviteCode: string, userId: string): Promise<Trip> => {
  const cleanCode = inviteCode.trim();

  // Try RPC first (security definer bypasses SELECT policy for non-members)
  const { data: rpcTrip, error: rpcError } = await (supabase as any).rpc('join_trip_by_code', {
    p_invite_code: cleanCode,
  });

  if (!rpcError && rpcTrip) {
    const trip = Array.isArray(rpcTrip) ? rpcTrip[0] : rpcTrip;
    if (trip && trip.id) {
      return trip as Trip;
    }
  }

  if (rpcError) {
    console.warn('join_trip_by_code RPC error:', rpcError.message);
  }

  // Fallback if RPC function is not created in DB yet
  const { data: trip, error: tripError } = await (supabase.from('trips') as any)
    .select('*')
    .ilike('invite_code', cleanCode)
    .single();

  if (tripError || !trip) {
    if (rpcError) {
      throw new Error(`Could not join trip. Please ensure database RPC 'join_trip_by_code' is created in Supabase.`);
    }
    throw new Error('Invalid invite code. No trip found.');
  }

  const { error: joinError } = await (supabase.from('trip_members') as any).insert({
    trip_id: (trip as any).id,
    user_id: userId,
    role: 'member',
  });

  if (joinError) {
    if (joinError.code === '23505') {
      throw new Error('You are already a member of this trip.');
    }
    throw new Error(joinError.message);
  }

  return trip as Trip;
};

export const updateTrip = async (
  tripId: string,
  updates: { name?: string; startDate?: string | null; endDate?: string | null; currency?: string }
): Promise<void> => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined)      payload.name       = updates.name.trim();
  if (updates.startDate !== undefined) payload.start_date = updates.startDate || null;
  if (updates.endDate   !== undefined) payload.end_date   = updates.endDate   || null;
  if (updates.currency  !== undefined) payload.currency   = updates.currency;

  const { error } = await (supabase.from('trips') as any)
    .update(payload)
    .eq('id', tripId);

  if (error) throw new Error(error.message);
};

export const removeTripMember = async (tripId: string, userId: string): Promise<void> => {
  const { error } = await (supabase.from('trip_members') as any)
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  const { error } = await (supabase.from('trips') as any)
    .delete()
    .eq('id', tripId);

  if (error) throw new Error(error.message);
};

export const claimPendingInvitations = async (): Promise<Trip[]> => {
  try {
    const { data, error } = await (supabase as any).rpc('claim_pending_invitations');
    if (!error && data) return data as Trip[];
  } catch (err) {
    console.warn('claim_pending_invitations RPC failed:', err);
  }
  return [];
};
