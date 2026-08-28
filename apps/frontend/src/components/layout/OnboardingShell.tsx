import type { ReactNode } from "react";
import { FiCheck } from "react-icons/fi";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../theme/ThemeToggle";

interface OnboardingShellProps {
  currentStep: 1 | 2 | 3;
  children: ReactNode;
  /** Roomier card for content-heavy steps (e.g. details grid) */
  wide?: boolean;
}

const steps = ["Organization", "Payment", "Details"];

export function OnboardingShell({
  currentStep,
  children,
  wide = false,
}: OnboardingShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background px-5">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0 opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-500/12 blur-3xl"
      />

      {/* Single slim header */}
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between py-5">
        <Logo />
        <ThemeToggle />
      </header>

      <main
        className={`relative z-10 mx-auto flex w-full flex-1 flex-col justify-center pb-20 ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        {/* Progress */}
        <ol
          className="mb-7 flex items-center gap-2"
          aria-label={`Onboarding progress: step ${currentStep} of ${steps.length}`}
        >
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const isDone = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <li key={label} className="flex flex-1 items-center gap-2.5">
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-all ${
                    isDone || isCurrent
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30"
                      : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isDone ? <FiCheck aria-hidden="true" /> : stepNumber}
                </span>
                <span
                  className={`hidden truncate text-sm font-medium sm:block ${
                    isCurrent
                      ? "text-foreground"
                      : isDone
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {label}
                </span>
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`h-px flex-1 rounded ${isDone ? "bg-gradient-to-r from-indigo-400 to-violet-400/70" : "bg-border"}`}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card p-7 shadow-xl shadow-indigo-950/[0.07] dark:shadow-black/40 sm:p-9">
          {children}
        </div>
      </main>
    </div>
  );
}
