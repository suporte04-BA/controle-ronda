import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { syncCurrentUserAccess } from "@/lib/access.functions";

export type AppRole = "admin" | "user";

interface Profile {
  id: string;
  nome: string;
  email: string;
  setor_id: string | null;
  foto_url: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  baseRole: AppRole | null;
  devViewRole: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setDevViewRole: (role: AppRole | null) => void;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const syncAccess = useServerFn(syncCurrentUserAccess);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [baseRole, setBaseRole] = useState<AppRole | null>(null);
  const [devViewRole, setDevViewRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("devViewRole");
    if (stored === "admin" || stored === "user") setDevViewRoleState(stored);
  }, []);

  const loadProfileAndRole = async (userId: string) => {
    try { await syncAccess(); } catch (e) { console.warn("syncAccess falhou:", e); }
    for (let attempt = 0; attempt < 4; attempt++) {
      const [{ data: prof }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("id,nome,email,setor_id,foto_url").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (prof && roleRows && roleRows.length > 0) {
        setProfile(prof as Profile);
        const roles = roleRows.map((r) => r.role as AppRole);
        setBaseRole(roles.includes("admin") ? "admin" : "user");
        return;
      }
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    }
    // Fallback final: ainda assim libera acesso como user
    const { data: prof } = await supabase.from("profiles").select("id,nome,email,setor_id,foto_url").eq("id", userId).maybeSingle();
    setProfile((prof as Profile) ?? null);
    setBaseRole("user");
  };

  const setDevViewRole = (role: AppRole | null) => {
    setDevViewRoleState(role);
    if (typeof window === "undefined") return;
    if (role) window.localStorage.setItem("devViewRole", role);
    else window.localStorage.removeItem("devViewRole");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfileAndRole(s.user.id), 0);
      } else {
        setProfile(null);
        setBaseRole(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) await loadProfileAndRole(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role: devViewRole ?? baseRole,
        baseRole,
        devViewRole,
        loading,
        signOut: async () => { setDevViewRole(null); await supabase.auth.signOut(); },
        refreshProfile: async () => { if (session?.user) await loadProfileAndRole(session.user.id); },
        setDevViewRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
