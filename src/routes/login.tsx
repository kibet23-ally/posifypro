// src/routes/login.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getPostLoginRoute } from "@/lib/role-routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShoppingBag, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // If already logged in, redirect based on role
  useEffect(() => {
    if (loading || !user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        navigate({ to: getPostLoginRoute(data?.role), replace: true });
      });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter your email and password"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      // Check role and redirect
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      navigate({ to: getPostLoginRoute(profile?.role), replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Invalid email or password");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your email address"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — desktop */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
          <ShoppingBag className="size-6 text-primary" /> PosifyPro
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            The smart POS<br />for modern businesses.
          </h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">
            Multi-tenant · Real-time · Built for Africa.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} PosifyPro</p>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <Link to="/" className="lg:hidden flex items-center gap-2 text-lg font-semibold mb-6">
            <ShoppingBag className="size-5 text-primary" /> PosifyPro
          </Link>

          {resetSent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Password reset link sent to <strong>{email}</strong>
              </p>
              <button
                onClick={() => { setMode("signin"); setResetSent(false); }}
                className="text-sm text-primary hover:underline font-medium"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">
                {mode === "signin" ? "Sign in" : "Reset password"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                {mode === "signin" ? "Welcome back to PosifyPro." : "We'll send you a reset link."}
              </p>

              <form onSubmit={mode === "signin" ? handleSignIn : handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@business.com" required autoComplete="email"
                  />
                </div>

                {mode === "signin" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" onClick={() => setMode("reset")} className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required minLength={6}
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Send Reset Link"}
                </Button>
              </form>

              {mode === "reset" ? (
                <button onClick={() => setMode("signin")} className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center">
                  ← Back to sign in
                </button>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground text-center">
                  New business?{" "}
                  <Link to="/onboarding" className="text-primary hover:underline font-medium">
                    Create a free account
                  </Link>
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
