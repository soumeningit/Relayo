import {
  FiActivity,
  FiAlertTriangle,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import { Card } from "../ui/Card";
import { FadeIn } from "./FadeIn";

const features = [
  {
    icon: FiRefreshCw,
    title: "Retries that actually work",
    description:
      "Exponential backoff with random jitter, capped at an hour. No thundering herds, no hammering a struggling endpoint.",
  },
  {
    icon: FiShield,
    title: "Signed payloads",
    description:
      "Every delivery is signed with a per-destination HMAC secret. Your customers verify authenticity in one line of code.",
  },
  {
    icon: FiActivity,
    title: "Circuit breakers",
    description:
      "Repeated failures pause delivery to a destination and auto-probe for recovery — protecting everyone downstream.",
  },
  {
    icon: FiAlertTriangle,
    title: "Dead-letter queue",
    description:
      "Exhausted deliveries are parked, never silently dropped. Replay them the moment your customer is back online.",
  },
  {
    icon: FiZap,
    title: "Idempotent ingestion",
    description:
      "Producer retries can't create duplicates. Send the same idempotency key twice — Relayo delivers once.",
  },
  {
    icon: FiTrendingUp,
    title: "Full visibility",
    description:
      "Every attempt logged: status codes, latency, errors. A dashboard that answers 'what happened to my webhook?' instantly.",
  },
];

/** Just the cards — used by the home page section and the /features page */
export function FeatureGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <FadeIn key={feature.title} delay={index * 0.06}>
          <Card hover className="group h-full p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 transition-transform duration-300 group-hover:scale-110 dark:text-indigo-300">
              <feature.icon size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="relative py-20 sm:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2
            id="features-heading"
            className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Built for the worst days
          </h2>
          <p className="mt-4 text-muted-foreground">
            Customer endpoints go down. Networks partition. Deployments roll
            slowly. Relayo is engineered so those moments are non-events.
          </p>
        </FadeIn>

        <div className="mt-14">
          <FeatureGrid />
        </div>
      </div>
    </section>
  );
}
