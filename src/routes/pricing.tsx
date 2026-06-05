// src/routes/pricing.tsx
// This is the route file — it just imports the pricing page
import { createFileRoute } from "@tanstack/react-router";
import PricingPage from "@/pages/PricingPage";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});
