import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard", replace: true }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) { toast.error(error.message); return; }
        toast.success("Welcome back!");
      } else {
        if (!businessName.trim()) { toast.error("Business name is required"); return; }
        const { error } = await signUp(email, password, name, businessName);
        if (error) { toast.error(error.message); return; }
        toast.success("Account created — sign in to continue.");
        setMode("signin");
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
          <ShoppingBag className="size-6 text-primary" />
          POSify Pro
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight">The modern POS<br />for ambitious shops.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">14-day free trial. One-time license. No recurring fees.</p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} POSify Pro</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <Link to="/" className="lg:hidden flex items-center gap-2 text-lg font-semibold mb-6">
            <ShoppingBag className="size-5 text-primary" /> POSify Pro
          </Link>
          <h2 className="text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create your shop"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Welcome back to POSify Pro." : "Start your 14-day free trial."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="biz">Business name</Label>
                  <Input id="biz" placeholder="e.g. Java Corner Café" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center">
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </Card>
      </div>
    </div>
  );
}
