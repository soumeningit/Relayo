import { FadeIn } from "./FadeIn";

const stats = [
  { value: "99.99%", label: "delivery success rate" },
  { value: "< 90s", label: "median time to first attempt" },
  { value: "1M+", label: "events delivered monthly" },
  { value: "7d", label: "full delivery log retention" },
];

export function StatsStrip() {
  return (
    <section aria-label="Relayo by the numbers" className="border-y border-border bg-card/50">
      <FadeIn className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-5 py-10 sm:px-8 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-2xl font-bold text-gradient sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {stat.label}
            </p>
          </div>
        ))}
      </FadeIn>
    </section>
  );
}
