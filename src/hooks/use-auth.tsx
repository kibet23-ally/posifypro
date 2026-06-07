import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    businessName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    setRole(data?.role ?? null);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      setSession(s);

      if (s?.user) {
        await fetchRole(s.user.id);
      }

      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (_event, s) => {
        setSession(s);

        if (s?.user) {
          await fetchRole(s.user.id);
        } else {
          setRole(null);
        }

        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    role,
    loading,

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    },

    signUp: async (email, password, name, businessName) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            business_name: businessName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      return { error };
    },

    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setRole(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}