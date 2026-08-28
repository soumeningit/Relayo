// Shared plan data for the pricing page and onboarding payment step
export type ApiPlanId = "FREE" | "PRO" | "SCALE";

export interface Plan {
  id: string;
  /** Value the backend expects in PATCH /org/:identifier/payment */
  apiPlanId: ApiPlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

export const plans: Plan[] = [
  {
    id: "free",
    apiPlanId: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "For side projects and evaluation",
    features: [
      "100k deliveries / month",
      "2 destinations",
      "3-day delivery log retention",
      "Community support",
    ],
  },
  {
    id: "pro",
    apiPlanId: "PRO",
    name: "Pro",
    price: "$29",
    period: "/month",
    tagline: "For production workloads",
    highlight: true,
    features: [
      "2M deliveries / month",
      "Unlimited destinations",
      "30-day log retention + replay",
      "Priority support",
    ],
  },
  {
    id: "scale",
    apiPlanId: "SCALE",
    name: "Scale",
    price: "$99",
    period: "/month",
    tagline: "For high-volume platforms",
    features: [
      "Unlimited deliveries",
      "SLA 99.99% uptime",
      "90-day retention + exports",
      "Dedicated support engineer",
    ],
  },
];

export const yearlyPrice = (plan: Plan): string => {
  if (plan.price === "$0") return "$0";
  const monthly = Number(plan.price.replace("$", ""));
  return `$${monthly * 10}`; // 2 months free
};

export const pricingFaqs = [
  {
    q: "What counts as a delivery?",
    a: "Every attempt we make to one destination counts once — retries caused by your endpoint being down are never billed against you twice.",
  },
  {
    q: "Can I change plans at any time?",
    a: "Yes. Upgrades apply immediately, downgrades take effect at the end of your billing cycle. Your delivery history always stays intact.",
  },
  {
    q: "What happens when I exceed my limit?",
    a: "We never drop webhooks silently. Events keep queueing during a grace period, and we notify you well before anything is throttled.",
  },
];
