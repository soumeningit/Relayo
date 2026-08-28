import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { FiCheck } from "react-icons/fi";

const stages = [
  {
    title: "POST /events",
    detail: '{ "event_type": "order.shipped", … }',
    tag: "idempotent",
  },
  {
    title: "Durable queue",
    detail: "Redis · consumer groups",
    tag: "at-least-once",
  },
  {
    title: "Sign & deliver",
    detail: "X-Relayo-Signature · HMAC-SHA256",
    tag: "verified",
  },
  {
    title: "Delivered",
    detail: "200 OK · attempt 1 of max",
    tag: "logged",
  },
];

export function PipelineVisual() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setActive((current) => (current + 1) % (stages.length + 1)),
      1500,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-cyan-400/10 blur-2xl" />
      <div className="relative rounded-2xl border border-border bg-card/90 p-5 shadow-2xl shadow-indigo-950/20 backdrop-blur sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs font-medium text-muted-foreground">
            relayo · delivery pipeline
          </span>
        </div>

        <ol className="space-y-3">
          {stages.map((stage, index) => {
            const isActive = active === index;
            const isDone = active > index;

            return (
              <motion.li
                key={stage.title}
                initial={false}
                animate={{
                  scale: isActive ? 1.02 : 1,
                  opacity: active >= index ? 1 : 0.55,
                }}
                transition={{ duration: 0.35 }}
                className={`flex items-center gap-3.5 rounded-xl border p-3.5 sm:p-4 ${
                  isActive
                    ? "border-indigo-400/60 bg-indigo-500/[0.07] shadow-lg shadow-indigo-500/10"
                    : "border-border bg-input/40"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
                    isDone || isActive
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-hidden="true"
                >
                  {isDone && !isActive ? <FiCheck /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    {stage.title}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {stage.detail}
                  </p>
                </div>
                <span
                  className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium sm:block ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stage.tag}
                </span>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground">
            retry policy
          </span>
          <span className="font-mono text-xs font-medium text-indigo-500 dark:text-indigo-300">
            exp backoff + jitter · cap 1h
          </span>
        </div>
      </div>
    </div>
  );
}
