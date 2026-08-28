import type { ReactNode } from "react";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneClasses = {
  default: "text-foreground",
  success: "text-emerald-500 dark:text-emerald-300",
  warning: "text-amber-500 dark:text-amber-300",
  danger: "text-red-500 dark:text-red-300",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
      </div>
      <p
        className={`mt-2 font-display text-2xl font-bold sm:text-3xl ${toneClasses[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
