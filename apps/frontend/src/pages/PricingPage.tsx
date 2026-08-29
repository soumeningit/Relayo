import { FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import { buttonClasses } from "../components/ui/buttonStyles";
import { Card } from "../components/ui/Card";
import { CtaSection } from "../components/landing/CtaSection";
import { FadeIn } from "../components/landing/FadeIn";
import { PageHeader } from "../components/layout/MarketingLayout";
import { plans, pricingFaqs, type Plan } from "../data/pricing";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Card
      hover
      className={`relative flex h-full flex-col p-6 ${
        plan.highlight
          ? "border-indigo-400/50 ring-2 ring-indigo-500/25"
          : ""
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-md shadow-indigo-500/30">
          Most popular
        </span>
      )}
      <h2 className="font-display text-lg font-semibold text-foreground">
        {plan.name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

      <p className="mt-5">
        <span className="font-display text-4xl font-bold text-foreground">
          {plan.price}
        </span>{" "}
        <span className="text-sm text-muted-foreground">{plan.period}</span>
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-500 dark:text-emerald-300">
        One-time — no subscription, no auto-renewal
      </p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <FiCheck
              className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-300"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PricingPage() {
  useDocumentMeta({
    title: "Pricing",
    description:
      "Simple, one-time pricing for Relayo. Start free with 100k deliveries per month — pay once for 30 days when your webhooks go production.",
  });

  return (
    <>
      <PageHeader
        badge="Pricing"
        title={
          <>
            Pricing that scales{" "}
            <span className="text-gradient">with your events</span>
          </>
        }
        subtitle="Start free. Pay once for 30 days when reliability becomes revenue. No per-webhook surprise fees — ever."
      />

      <section className="px-5 pb-16 pt-2 sm:px-8" aria-label="Plans">
        <div className="mx-auto grid max-w-5xl gap-6 pt-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <FadeIn key={plan.id} delay={index * 0.08}>
              <PlanCard plan={plan} />
            </FadeIn>
          ))}
        </div>

        <FadeIn className="mx-auto mt-10 max-w-5xl text-center">
          <Link
            to="/signup"
            className={
              buttonClasses("primary", "lg") + " w-full text-white sm:w-auto"
            }
          >
            Start free
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            All plans include retries, HMAC signing and the full dashboard.
            Upgrade once and your period starts immediately.
          </p>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section className="border-t border-border px-5 py-20 sm:px-8" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <h2
              id="faq-heading"
              className="text-center font-display text-3xl font-bold tracking-tight text-foreground"
            >
              Questions, answered
            </h2>
          </FadeIn>
          <div className="mt-8 space-y-3">
            {pricingFaqs.map((faq, index) => (
              <FadeIn key={faq.q} delay={index * 0.06}>
                <details className="group rounded-2xl border border-border bg-card p-5 open:border-indigo-400/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span
                      className="shrink-0 text-indigo-500 transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}

export default PricingPage;
