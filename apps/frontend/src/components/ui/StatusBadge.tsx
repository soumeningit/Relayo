import type { CircuitState, DeliveryStatus, DestinationStatus } from "../../types/dashboard";

type Variant = "success" | "warning" | "danger" | "neutral" | "info";

const variantClasses: Record<Variant, string> = {
  success:
    "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-500/25",
  warning:
    "bg-amber-500/12 text-amber-600 dark:text-amber-300 border-amber-500/25",
  danger: "bg-red-500/12 text-red-500 dark:text-red-300 border-red-500/25",
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-indigo-500/12 text-indigo-500 dark:text-indigo-300 border-indigo-500/25",
};

function StatusBadgeBase({
  label,
  variant,
  pulse,
}: {
  label: string;
  variant: Variant;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${variantClasses[variant]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${variant === "success" ? "bg-emerald-500" : variant === "warning" ? "bg-amber-500" : variant === "danger" ? "bg-red-500" : "bg-current"} ${
          pulse ? "animate-pulse-glow" : ""
        }`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  if (status === "delivered") return <StatusBadgeBase label="delivered" variant="success" />;
  if (status === "pending") return <StatusBadgeBase label="pending" variant="info" />;
  if (status === "failed") return <StatusBadgeBase label="retrying" variant="warning" />;
  return <StatusBadgeBase label="dead letter" variant="danger" />;
}

export function DestinationStatusBadge({
  status,
}: {
  status: DestinationStatus;
}) {
  if (status === "active") return <StatusBadgeBase label="active" variant="success" />;
  return <StatusBadgeBase label="paused" variant="warning" />;
}

export function CircuitStateBadge({ state }: { state: CircuitState }) {
  if (state === "closed")
    return <StatusBadgeBase label="breaker closed" variant="success" />;
  if (state === "open")
    return <StatusBadgeBase label="breaker open" variant="danger" pulse />;
  return <StatusBadgeBase label="half open" variant="warning" pulse />;
}
