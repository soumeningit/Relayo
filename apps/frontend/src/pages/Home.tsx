import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Hero } from "../components/landing/Hero";
import { StatsStrip } from "../components/landing/StatsStrip";
import { Features } from "../components/landing/Features";
import { HowItWorks } from "../components/landing/HowItWorks";
import { CtaSection } from "../components/landing/CtaSection";

function Home() {
  useDocumentMeta({
    title: undefined,
    description:
      "Relayo guarantees your webhooks arrive. Retries with exponential backoff and jitter, HMAC-signed payloads, per-destination circuit breakers, dead-lettering and a full delivery dashboard.",
  });

  return (
    <>
      <Hero />
      <StatsStrip />
      <Features />
      <HowItWorks />
      <CtaSection />
    </>
  );
}

export default Home;
