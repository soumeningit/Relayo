import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { buttonClasses } from "../ui/buttonStyles";
import { FadeIn } from "./FadeIn";

export function CtaSection() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-24" aria-labelledby="cta-heading">
      <FadeIn className="mx-auto max-w-5xl">
        <div className="ambient-glow relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-card via-card to-indigo-950/30 px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_60%)]"
          />
          <h2
            id="cta-heading"
            className="relative font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Stop losing webhooks.
            <span className="text-gradient"> Start delivering them.</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
            Create your first tenant, register a destination and send an event —
            all before your coffee cools down.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Link
              to="/signup"
              className={
                buttonClasses("primary", "lg") + " w-full text-white sm:w-auto"
              }
            >
              Get started with Relayo <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
