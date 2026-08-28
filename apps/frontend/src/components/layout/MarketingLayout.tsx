import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "../landing/Footer";

/**
 * Shared chrome for all public marketing pages:
 * fixed navbar on top, footer at the bottom, routed content in between.
 */
export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

interface PageHeaderProps {
  badge?: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}

/** Consistent hero-lite header for marketing subpages */
export function PageHeader({ badge, title, subtitle, children }: PageHeaderProps) {
  return (
    <section className="ambient-glow relative overflow-hidden pb-12 pt-32 sm:pt-40">
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        {badge && (
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">
            <span
              className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            {badge}
          </span>
        )}
        <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
