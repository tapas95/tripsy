import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
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
  const redirectUrl = AuthSession.makeRedirectUri({
    scheme: 'tripsy',
    path: 'auth/callback',
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.url) {
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (res.type === 'success' && res.url) {
      // Extract tokens from URL hash (#access_token=...&refresh_token=...) or query params
      const parsedUrl = new URL(res.url.replace('#', '?'));
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw new Error(sessionError.message);
        }
      }
    }
  }

  return data;
};

export const resetPasswordForEmail = async (email: string) => {
  const redirectUrl = AuthSession.makeRedirectUri({
    scheme: 'tripsy',
    path: 'auth/reset-password',
  });

  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUrl,
  });

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
  updates: { name?: string; defaultCurrency?: string; avatarUrl?: string | null }
): Promise<void> => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined)            payload.name             = updates.name.trim();
  if (updates.defaultCurrency !== undefined) payload.default_currency = updates.defaultCurrency;
  if (updates.avatarUrl       !== undefined) payload.avatar_url       = updates.avatarUrl;

  const { error } = await (supabase.from('profiles') as any)
    .update(payload)
    .eq('id', userId);

  if (error) throw new Error(error.message);
};

export const deleteAccount = async (userId: string): Promise<void> => {
  const { error: rpcError } = await supabase.rpc('delete_user_account');
  if (rpcError) {
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) throw new Error(profileError.message);
  }
  await supabase.auth.signOut();
};
