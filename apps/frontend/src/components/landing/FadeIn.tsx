import type { ReactNode } from "react";
import { motion } from "motion/react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  y = 28,
  className,
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.65, 0.35, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
