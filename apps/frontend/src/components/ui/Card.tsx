import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card text-card-foreground ${
        hover
          ? "transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-xl hover:shadow-indigo-500/10"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
