import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

export interface TripMemberProfile extends Profile {
  role: 'owner' | 'member';
}

export const getTripMembers = async (tripId: string): Promise<TripMemberProfile[]> => {
  const { data, error } = await supabase
    .from('trip_members')
    .select('role, profiles(*)')
    .eq('trip_id', tripId);

  if (error) throw new Error(error.message);

  return (data as any[])
    .filter((row) => row.profiles !== null)
    .map((row) => ({ ...row.profiles, role: row.role }));
};
