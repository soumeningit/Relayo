import { FiEye, FiShield, FiZap } from "react-icons/fi";
import { Card } from "../components/ui/Card";
import { StatsStrip } from "../components/landing/StatsStrip";
import { CtaSection } from "../components/landing/CtaSection";
import { FadeIn } from "../components/landing/FadeIn";
import { PageHeader } from "../components/layout/MarketingLayout";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

const values = [
  {
    icon: FiShield,
    title: "Reliability is the product",
    detail:
      "Every design decision starts with one question: what happens when the endpoint is down at 3am? If the answer loses data, we redesign.",
  },
  {
    icon: FiEye,
    title: "Radical observability",
    detail:
      "You should never wonder where a webhook went. Every attempt, response code and millisecond of latency is yours to inspect.",
  },
  {
    icon: FiZap,
    title: "Boring technology, exciting uptime",
    detail:
      "Postgres, Redis and battle-tested queues. We save the novelty for your dashboard, not your delivery path.",
  },
];

const timeline = [
  {
    year: "The itch",
    text: "Running a SaaS, we lost customer webhooks to a 20-minute deploy window. Our users' integrations silently broke — and we couldn't even prove it wasn't their fault.",
  },
  {
    year: "The insight",
    text: "Webhook delivery is a courier problem: accept the package, retry through storms, sign it so recipients trust it, and show receipts. Nobody should rebuild that per-product.",
  },
  {
    year: "Relayo",
    text: "A delivery platform engineered around worst-case days — exponential backoff with jitter, circuit breakers, dead-lettering, replay, and an attempt log for every event.",
  },
];

function AboutPage() {
  useDocumentMeta({
    title: "About",
    description:
      "Why Relayo exists: webhook delivery is a courier problem. Meet the team philosophy behind reliable, signed, observable event delivery.",
  });

  return (
    <>
      <PageHeader
        badge="About"
        title={
          <>
            A courier service for{" "}
            <span className="text-gradient">your events</span>
          </>
        }
        subtitle="Relayo exists because 'the webhook didn't arrive' should never be a sentence your customers have to say."
      />

      {/* Values */}
      <section className="px-5 py-12 sm:px-8" aria-labelledby="values-heading">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <h2
              id="values-heading"
              className="text-center font-display text-3xl font-bold tracking-tight text-foreground"
            >
              What we optimize for
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {values.map((value, index) => (
              <FadeIn key={value.title} delay={index * 0.08}>
                <Card hover className="h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 dark:text-indigo-300">
                    <value.icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {value.detail}
                  </p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <StatsStrip />

      {/* Story */}
      <section className="px-5 py-20 sm:px-8" aria-labelledby="story-heading">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <h2
              id="story-heading"
              className="text-center font-display text-3xl font-bold tracking-tight text-foreground"
            >
              Why we built this
            </h2>
          </FadeIn>
          <ol className="mt-10 space-y-8 border-l border-border pl-6">
            {timeline.map((item, index) => (
              <FadeIn key={item.year} delay={index * 0.1}>
                <li className="relative">
                  <span
                    className="absolute -left-[31px] top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/30"
                    aria-hidden="true"
                  >
                    <span className="h-[6px] w-[6px] rounded-full bg-white" />
                  </span>
                  <p className="font-mono text-xs uppercase tracking-wider text-indigo-500 dark:text-indigo-300">
                    {item.year}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      <CtaSection />
    </>
  );
}

export default AboutPage;
