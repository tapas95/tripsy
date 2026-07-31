import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

WebBrowser.maybeCompleteAuthSession();

export interface AuthState {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        name: name.trim(),
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.url) {
    const res = await WebBrowser.openAuthSessionAsync(data.url);
    if (res.type === 'success' && res.url) {
      const urlParams = new URL(res.url);
      const accessToken = urlParams.searchParams.get('access_token');
      const refreshToken = urlParams.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  }

  return data;
};

export const resetPasswordForEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updateUserPassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

export const getCurrentProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as Profile;
};

export const updateProfile = async (
  userId: string,
  updates: { name?: string; defaultCurrency?: string }
): Promise<void> => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined)            payload.name             = updates.name.trim();
  if (updates.defaultCurrency !== undefined) payload.default_currency = updates.defaultCurrency;

  const { error } = await (supabase.from('profiles') as any)
    .update(payload)
    .eq('id', userId);

  if (error) throw new Error(error.message);
};
