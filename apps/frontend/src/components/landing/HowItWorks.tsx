import { FiAnchor, FiSend, FiTruck } from "react-icons/fi";
import { FadeIn } from "./FadeIn";

const steps = [
  {
    icon: FiAnchor,
    step: "01",
    title: "Register a destination",
    description:
      "Give us a URL. Relayo generates a signing secret and health-tracks the endpoint from day one.",
    code: "POST /destinations",
  },
  {
    icon: FiSend,
    step: "02",
    title: "Fire events at Relayo",
    description:
      "One POST with an event type, payload and idempotency key. We fan out to every subscribed destination.",
    code: "POST /events",
  },
  {
    icon: FiTruck,
    step: "03",
    title: "We deliver, you relax",
    description:
      "Signed payloads, retried through failures with backoff + jitter, circuit-broken when needed — every attempt in your log.",
    code: "200 OK · delivered",
  },
];

/** Just the 3-step list — used by the home page section and /how-it-works */
export function HowItWorksSteps() {
  return (
    <ol className="grid gap-5 md:grid-cols-3">
      {steps.map((step, index) => (
        <FadeIn key={step.step} delay={index * 0.1}>
          <li className="relative h-full rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
            <span className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 font-mono text-[11px] font-semibold text-white shadow-md shadow-indigo-500/25">
              {step.code}
            </span>
            <step.icon
              className="text-indigo-500 dark:text-indigo-300"
              size={26}
              aria-hidden="true"
            />
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              STEP {step.step}
            </p>
            <h3 className="mt-1.5 font-display text-lg font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </li>
        </FadeIn>
      ))}
    </ol>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-20 sm:py-28"
      aria-labelledby="how-heading"
    >
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0 opacity-60"
      />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2
            id="how-heading"
            className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Three steps to bulletproof webhooks
          </h2>
          <p className="mt-4 text-muted-foreground">
            Integrate in minutes. Your first delivery is one API call away.
          </p>
        </FadeIn>

        <div className="mt-14">
          <HowItWorksSteps />
        </div>
      </div>
    </section>
  );
}
