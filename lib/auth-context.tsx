import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { logger } from "./logger";

/**
 * Authentication context interface
 * Provides user session management and authentication methods
 */
interface AuthContextType {
  /** Current authenticated user */
  user: User | null;
  /** Current session object */
  session: Session | null;
  /** Loading state for authentication operations */
  loading: boolean;
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Create new account with email and password */
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Sign out current user */
  signOut: () => Promise<{ error: Error | null }>;
  /** Sign in using Google OAuth */
  signInWithGoogle: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component
 * Manages user authentication state and provides auth methods to children
 * 
 * @param props - Component props
 * @param props.children - Child components that need access to auth context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on client-side when supabase client is available
    if (!supabase || typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign in user with email and password
   */
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error("Supabase client not available") };
    }
    logger.user.auth("sign_in_attempt", undefined);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      logger.user.auth("sign_in_success", user?.id);
    }
    return { error };
  };

  /**
   * Create new user account with email and password
   */
  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error("Supabase client not available") };
    }
    logger.user.auth("sign_up_attempt", undefined);
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    if (!supabase) {
      return { error: new Error("Supabase client not available") };
    }
    logger.user.auth("sign_out", user?.id);
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  /**
   * Sign in using Google OAuth provider
   */
  const signInWithGoogle = async () => {
    if (!supabase) {
      return { error: new Error("Supabase client not available") };
    }
    logger.user.auth("google_sign_in_attempt", undefined);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access authentication context
 * Must be used within an AuthProvider component tree
 * 
 * @returns AuthContextType object with user, session, and auth methods
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
