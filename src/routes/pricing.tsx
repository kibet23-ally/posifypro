import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, ShoppingBag, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — POSify Pro" },
      { name: "description", content: "Simple one-time pricing for POSify Pro. Pay once, use forever. Includes unlimited products, sales and staff." },
      { property: "og:title", content: "POSify Pro Pricing — Pay once, use forever" },
      { property: "og:description", content: "One simple lifetime license for your shop. No subscriptions." },
    ],
  }),
  component: PricingPage,
});

const features = [
  "Unlimited products & sales",
  "Unlimited cashiers in your shop",
  "Inventory & low-stock alerts",
  "Customer directory",
  "Sales history & receipts",
  "Dashboard insights",
  "Cash, M-Pesa & Card payment tracking",
  "All future updates",
  "Priority email support",
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="size-5 text-primary" /> POSify Pro
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back to home
          </Link>
        </div>
      </header>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h1 className="text-4xl md:text-5xl font-bold">Simple, honest pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Try POSify Pro free for 14 days. Pay once when you're ready — own it forever.
          </p>

          <div className="mt-12 grid md:grid-cols-2 gap-5 text-left">
            <div className="rounded-2xl border bg-card p-8">
              <div className="text-sm font-medium text-muted-foreground">Free Trial</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/ 14 days</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Try every feature with no card on file.</p>
              <ul className="mt-6 space-y-2 text-sm">
                {features.slice(0, 5).map((f) => (
                  <li key={f} className="flex gap-2"><Check className="size-4 text-primary mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link to="/login"><Button variant="outline" className="mt-6 w-full" size="lg">Start trial</Button></Link>
            </div>

            <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Best value
              </div>
              <div className="text-sm font-medium text-primary">Lifetime License</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold">$199</span>
                <span className="text-muted-foreground">one-time</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Pay once. Use POSify Pro forever.</p>
              <ul className="mt-6 space-y-2 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="size-4 text-primary mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link to="/login"><Button className="mt-6 w-full" size="lg">Get lifetime access</Button></Link>
              <p className="mt-3 text-xs text-center text-muted-foreground">
                Stripe checkout — secure one-time payment.
              </p>
            </div>
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Questions? Email <a href="mailto:hello@posifypro.app" className="text-primary hover:underline">hello@posifypro.app</a>
          </p>
        </div>
      </section>
    </div>
  );
}
