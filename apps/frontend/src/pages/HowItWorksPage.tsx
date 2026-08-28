import { HowItWorksSteps } from "../components/landing/HowItWorks";
import { PipelineVisual } from "../components/landing/PipelineVisual";
import { CtaSection } from "../components/landing/CtaSection";
import { FadeIn } from "../components/landing/FadeIn";
import { PageHeader } from "../components/layout/MarketingLayout";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

const guarantees = [
  {
    title: "At-least-once delivery",
    detail:
      "We keep trying until your endpoint confirms. Consumers dedupe by event ID — documented everywhere, never faked.",
  },
  {
    title: "Exponential backoff + jitter",
    detail:
      "Retries start at 1s and grow to a 1h cap, with random jitter so a recovering endpoint isn't stampeded.",
  },
  {
    title: "Durable circuit breakers",
    detail:
      "Breaker state lives in Redis, not worker memory — crashes and deploys can't silently reset protection.",
  },
];

function HowItWorksPage() {
  useDocumentMeta({
    title: "How it works",
    description:
      "From registering a destination to guaranteed delivery: how Relayo ingests, queues, signs, retries and logs every webhook event.",
  });

  return (
    <>
      <PageHeader
        badge="The pipeline"
        title={
          <>
            From POST to{" "}
            <span className="text-gradient">proof of delivery</span>
          </>
        }
        subtitle="Three integration steps on your side. A relentlessly reliable pipeline on ours."
      />

      <section className="px-5 pb-20 pt-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <HowItWorksSteps />

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
            <FadeIn>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                What we guarantee
              </h2>
              <p className="mt-3 text-muted-foreground">
                No marketing hand-waving — these are the exact semantics of the
                pipeline, documented the same way in our API reference.
              </p>
              <ul className="mt-7 space-y-5">
                {guarantees.map((item) => (
                  <li key={item.title} className="flex items-start gap-3.5">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn delay={0.15}>
              <PipelineVisual />
            </FadeIn>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}

export default HowItWorksPage;
