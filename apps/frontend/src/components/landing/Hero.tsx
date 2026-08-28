import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { FiArrowRight, FiPlay } from "react-icons/fi";
import { buttonClasses } from "../ui/buttonStyles";
import { Badge } from "../ui/Badge";
import { PipelineVisual } from "./PipelineVisual";

export function Hero() {
  return (
    <section className="ambient-glow relative overflow-hidden pb-20 pt-32 sm:pt-40">
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <Badge>
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-500" />
              At-least-once delivery — guaranteed
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl xl:text-[3.6rem]"
          >
            Webhooks that{" "}
            <span className="text-gradient">always arrive.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0"
          >
            Relayo is a courier service for your HTTP events. We accept the
            package, retry through outages with exponential backoff, sign every
            payload so recipients can trust it, and show you exactly what
            happened — attempt by attempt.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link
              to="/signup"
              className={
                buttonClasses("primary", "lg") +
                " w-full text-white sm:w-auto"
              }
            >
              Start delivering free <FiArrowRight aria-hidden="true" />
            </Link>
            <Link
              to="/how-it-works"
              className={buttonClasses("outline", "lg") + " w-full sm:w-auto"}
            >
              <FiPlay aria-hidden="true" /> See how it works
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.36 }}
            className="mt-5 text-xs text-muted-foreground"
          >
            No credit card required · First 100k deliveries free
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="animate-float"
        >
          <PipelineVisual />
        </motion.div>
      </div>
    </section>
  );
}
