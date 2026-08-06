import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
  getCurrentProfile,
} from '../api/auth';

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchProfile = async (userId: string, currentUser?: User | null) => {
    try {
      let userProfile = await getCurrentProfile(userId);
      if (userProfile && currentUser?.user_metadata) {
        const googleAvatar = currentUser.user_metadata.avatar_url || currentUser.user_metadata.picture;
        const googleName = currentUser.user_metadata.full_name || currentUser.user_metadata.name;

        let needsUpdate = false;
        const updates: { avatarUrl?: string; name?: string } = {};

        if (!userProfile.avatar_url && googleAvatar) {
          updates.avatarUrl = googleAvatar;
          needsUpdate = true;
        }
        if (googleName && (userProfile.name === 'New User' || !userProfile.name)) {
          updates.name = googleName;
          needsUpdate = true;
        }

        if (needsUpdate) {
          const { updateProfile } = await import('../api/auth');
          await updateProfile(userId, updates);
          userProfile = await getCurrentProfile(userId);
        }
      }
      setProfile(userProfile);
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await signInWithEmail(email, password);
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      await fetchProfile(data.session.user.id);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const data = await signUpWithEmail(email, password, name);
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      await fetchProfile(data.session.user.id);
    }
  };

  const signInWithGoogle = async () => {
    await apiSignInWithGoogle();
  };

  const signOut = async () => {
    await apiSignOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsPasswordRecovery(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isPasswordRecovery,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
