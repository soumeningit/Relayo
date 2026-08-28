import { FeatureGrid } from "../components/landing/Features";
import { CtaSection } from "../components/landing/CtaSection";
import { FadeIn } from "../components/landing/FadeIn";
import { PageHeader } from "../components/layout/MarketingLayout";
import { Card } from "../components/ui/Card";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

const deepDives = [
  {
    title: "Delivery pipeline",
    points: [
      "Durable queue with consumer groups — nothing lost on worker crashes",
      "Per-destination ordering: parallel across endpoints, in-order within one",
      "Dead-letter parking after max attempts, one-click replay",
    ],
  },
  {
    title: "Security",
    points: [
      "HMAC-SHA256 signature on every payload with a per-destination secret",
      "Secret rotation with zero-downtime overlap window",
      "API keys hashed at rest; MFA-protected dashboard access",
    ],
  },
  {
    title: "Operations",
    points: [
      "Full attempt log: status codes, latency, error classification",
      "Circuit breakers with automatic recovery probes",
      "Idempotent ingestion keyed per tenant",
    ],
  },
];

function FeaturesPage() {
  useDocumentMeta({
    title: "Features",
    description:
      "Explore Relayo's reliability toolkit: retries with exponential backoff and jitter, HMAC signing, circuit breakers, dead-lettering, replay and full delivery visibility.",
  });

  return (
    <>
      <PageHeader
        badge="Capabilities"
        title={
          <>
            Everything you need to{" "}
            <span className="text-gradient">trust your webhooks</span>
          </>
        }
        subtitle="Reliability isn't a feature you bolt on later — it's the whole product. Here's what's under the hood."
      />

      <section className="pb-8 pt-4">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FeatureGrid />
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8" aria-label="Deep dive">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {deepDives.map((group, index) => (
            <FadeIn key={group.title} delay={index * 0.08}>
              <Card className="h-full p-6">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {group.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
                        aria-hidden="true"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      <CtaSection />
    </>
  );
}

export default FeaturesPage;
