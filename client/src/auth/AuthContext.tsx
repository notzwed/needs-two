import type { PublicProfile } from "@needs-two/shared";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../supabaseClient";

export interface SignUpInput {
  email: string;
  password: string;
  nickname: string;
  avatarKey: string;
  nicknameColor: string;
  nicknameFont: string;
}

interface ProfileUpdateInput {
  nickname: string;
  avatarKey: string;
  avatarUrl: string | null;
  nicknameColor: string;
  nicknameFont: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: PublicProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (input: SignUpInput) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<string | null>;
  updateBadges: (displayed: string[], featured: string | null) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(message: string) {
  const text = message.toLocaleLowerCase();
  if (text.includes("invalid login")) return "Email o password non corretti.";
  if (text.includes("already registered") || text.includes("already been registered")) return "Questa email è già registrata.";
  if (text.includes("nickname") && text.includes("uso")) return "Questo nickname è già in uso.";
  if (text.includes("rate limit")) return "Troppi tentativi. Aspetta un momento e riprova.";
  if (text.includes("password")) return "Usa una password di almeno 8 caratteri.";
  return message || "Qualcosa non ha funzionato. Riprova.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const { data: { session: current } } = await supabase.auth.getSession();
    if (!current) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    const { data, error } = await supabase.rpc("needs_two_get_my_profile");
    if (!error) setProfile((data ?? null) as PublicProfile | null);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) void refreshProfile();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) queueMicrotask(() => void refreshProfile());
      else setProfile(null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signUp = useCallback(async (input: SignUpInput) => {
    if (!supabase) return "Servizio account non configurato.";
    const { error } = await supabase.auth.signUp({
      email: input.email.trim().toLocaleLowerCase(),
      password: input.password,
      options: {
        data: {
          nickname: input.nickname.trim(),
          avatar_key: input.avatarKey,
          nickname_color: input.nicknameColor,
          nickname_font: input.nicknameFont,
        },
      },
    });
    if (error) return friendlyAuthError(error.message);
    await refreshProfile();
    return null;
  }, [refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Servizio account non configurato.";
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLocaleLowerCase(),
      password,
    });
    if (error) return friendlyAuthError(error.message);
    await refreshProfile();
    return null;
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (input: ProfileUpdateInput) => {
    if (!supabase) return "Servizio account non configurato.";
    const { data, error } = await supabase.rpc("needs_two_update_profile", {
      p_nickname: input.nickname,
      p_avatar_key: input.avatarKey,
      p_avatar_url: input.avatarUrl,
      p_nickname_color: input.nicknameColor,
      p_nickname_font: input.nicknameFont,
    });
    if (error) return friendlyAuthError(error.message);
    setProfile(data as PublicProfile);
    return null;
  }, []);

  const updateBadges = useCallback(async (displayed: string[], featured: string | null) => {
    if (!supabase) return "Servizio account non configurato.";
    const { data, error } = await supabase.rpc("needs_two_set_featured_badges", {
      p_displayed: displayed,
      p_featured: featured,
    });
    if (error) return friendlyAuthError(error.message);
    setProfile(data as PublicProfile);
    return null;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    updateProfile,
    updateBadges,
  }), [session, profile, loading, profileLoading, signUp, signIn, signOut, refreshProfile, updateProfile, updateBadges]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
