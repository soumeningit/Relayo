import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { FiCheck, FiRefreshCw, FiShield } from "react-icons/fi";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../theme/ThemeToggle";

const highlights = [
  {
    icon: FiShield,
    text: "HMAC-signed deliveries your customers can verify",
  },
  {
    icon: FiRefreshCw,
    text: "Retries with exponential backoff and jitter",
  },
  { icon: FiCheck, text: "Every attempt logged — nothing lost silently" },
];

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Brand panel */}
      <aside className="ambient-glow relative hidden w-[42%] flex-col justify-between overflow-hidden border-r border-border bg-card/40 p-10 lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="grid-lines pointer-events-none absolute inset-0 opacity-70"
        />
        <div className="relative">
          <Logo size="lg" />
        </div>

        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground xl:text-4xl">
            The courier service
            <br />
            for your <span className="text-gradient">webhooks.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/12 text-indigo-500 dark:text-indigo-300">
                  <item.icon size={15} aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} Relayo — reliable webhook delivery.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:hidden">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="hidden justify-end lg:flex">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8"
        >
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
          <div className="mt-8">{children}</div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
