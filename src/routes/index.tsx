import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Zap, BarChart3, Users, Package, Receipt, ShieldCheck, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "POSify Pro — The modern point-of-sale SaaS for ambitious shops" },
      { name: "description", content: "Run sales, manage inventory, track customers and grow — POSify Pro is a fast, beautiful POS built for shops, cafés and retail. One-time payment, lifetime access." },
      { property: "og:title", content: "POSify Pro — Modern POS SaaS" },
      { property: "og:description", content: "Run sales, manage inventory and grow your shop with POSify Pro. One-time license, lifetime access." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/70 border-b">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="size-5 text-primary" /> POSify Pro
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/login"><Button size="sm">Start free</Button></Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent)]" />
        <div className="max-w-5xl mx-auto px-5 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1 text-muted-foreground">
            <Zap className="size-3 text-primary" /> 14-day free trial · No card required
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
            The modern POS SaaS<br />
            <span className="text-primary">for ambitious shops.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            POSify Pro is a fast, beautiful point-of-sale system for shops, cafés and retail.
            Sell faster, track every shilling, and run your business from any device.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login"><Button size="lg">Start your free trial</Button></Link>
            <Link to="/pricing"><Button size="lg" variant="outline">See pricing</Button></Link>
          </div>
          <div className="mt-12 mx-auto max-w-3xl rounded-2xl border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-muted/30">
              <span className="size-2.5 rounded-full bg-destructive/60" />
              <span className="size-2.5 rounded-full bg-warning/60" />
              <span className="size-2.5 rounded-full bg-success/60" />
              <span className="ml-3 text-xs text-muted-foreground">posifypro.app / pos</span>
            </div>
            <div className="grid grid-cols-3 gap-3 p-5 text-left">
              {[
                { e: "☕", n: "Espresso", p: "KSh 180" },
                { e: "🥐", n: "Croissant", p: "KSh 220" },
                { e: "🥪", n: "Club Sandwich", p: "KSh 550" },
                { e: "🍰", n: "Cheesecake", p: "KSh 400" },
                { e: "🧃", n: "Fresh Juice", p: "KSh 250" },
                { e: "🍪", n: "Cookies", p: "KSh 150" },
              ].map((it) => (
                <div key={it.n} className="p-3 rounded-lg border bg-background">
                  <div className="text-2xl">{it.e}</div>
                  <div className="mt-1 text-sm font-medium">{it.n}</div>
                  <div className="text-primary text-sm font-semibold">{it.p}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 border-t">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need to run your shop</h2>
            <p className="mt-3 text-muted-foreground">From the first sale to the end-of-day report.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { i: Zap, t: "Lightning-fast checkout", d: "Add items, accept Cash, M-Pesa or Card and print a receipt in seconds." },
              { i: Package, t: "Inventory & stock alerts", d: "Track stock in real time and get notified when products run low." },
              { i: Users, t: "Customer directory", d: "Save customers, track their visits and reward your loyal regulars." },
              { i: Receipt, t: "Sales history & receipts", d: "Browse every sale, reprint a receipt, and find a transaction instantly." },
              { i: BarChart3, t: "Dashboard insights", d: "See today's revenue, best sellers and trends without exporting a thing." },
              { i: ShieldCheck, t: "Secure multi-tenant", d: "Your data is isolated to your business with bank-grade row-level security." },
            ].map((f) => (
              <div key={f.t} className="p-6 rounded-xl border bg-card hover:border-primary/50 transition">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <f.i className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t bg-muted/20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Pay once. Use forever.</h2>
          <p className="mt-3 text-muted-foreground">No recurring fees, no per-seat surprises. One simple lifetime license.</p>
          <div className="mt-10 inline-block text-left rounded-2xl border bg-card p-8 shadow-lg">
            <div className="text-sm font-medium text-primary">Lifetime License</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold">$199</span>
              <span className="text-muted-foreground">one-time</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {["Unlimited products & sales", "Unlimited cashiers in your shop", "All future updates included", "Priority email support"].map((l) => (
                <li key={l} className="flex gap-2"><Check className="size-4 text-primary mt-0.5" /> {l}</li>
              ))}
            </ul>
            <Link to="/pricing"><Button className="mt-6 w-full" size="lg">Get POSify Pro</Button></Link>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 border-t">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is there a free trial?", a: "Yes — every new account gets a 14-day free trial of all features. No credit card required." },
              { q: "How does the one-time payment work?", a: "Pay $199 once and your business gets a lifetime license to POSify Pro, including all future updates." },
              { q: "Can I add my staff?", a: "Yes. Owners can invite cashiers and managers to their shop. Each user signs in with their own account." },
              { q: "Is my data secure?", a: "Every business's data is isolated using row-level security. Only members of your shop can see your products, sales and customers." },
            ].map((f) => (
              <details key={f.q} className="rounded-lg border bg-card p-4 group">
                <summary className="font-medium cursor-pointer flex justify-between items-center">
                  {f.q} <span className="text-muted-foreground group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><ShoppingBag className="size-4 text-primary" /> POSify Pro</div>
          <div>© {new Date().getFullYear()} POSify Pro. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
