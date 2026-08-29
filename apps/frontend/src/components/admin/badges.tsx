import type {
  AdminConfigStatusLevel,
  AdminDeliveryStatus,
  AdminIncident,
  AdminOrgStatus,
  AdminPaymentStatus,
  AdminPlan,
  AdminUserStatus,
} from "../../types/admin";
import { PLAN_LABELS } from "../../types/admin";

const pillBase = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium";

const planStyles: Record<AdminPlan, string> = {
  FREE: "border border-border bg-muted text-muted-foreground",
  PRO: "border border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  SCALE: "border border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300",
};

export function PlanBadge({ plan }: { plan: AdminPlan }) {
  return (
    <span className={`${pillBase} ${planStyles[plan]}`}>{PLAN_LABELS[plan]}</span>
  );
}

export function OrgStatusBadge({ status }: { status: AdminOrgStatus }) {
  const isActive = status === "active";
  return (
    <span
      className={`${pillBase} ${
        isActive
          ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : "border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      {isActive ? "Active" : "Suspended"}
    </span>
  );
}

export function UserStatusBadge({ status }: { status: AdminUserStatus }) {
  if (status === "suspended") {
    return (
      <span className={`${pillBase} border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300`}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Suspended
      </span>
    );
  }
  const isVerified = status === "verified";
  return (
    <span
      className={`${pillBase} ${
        isVerified
          ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
      }`}
    >
      {isVerified ? "Verified" : "Unverified"}
    </span>
  );
}

const paymentStyles: Record<AdminPaymentStatus, string> = {
  paid: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  pending: "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  failed: "border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300",
  refunded: "border border-border bg-muted text-muted-foreground",
};

export function PaymentStatusBadge({ status }: { status: AdminPaymentStatus }) {
  return (
    <span className={`${pillBase} ${paymentStyles[status]}`}>
      <span className="capitalize">{status}</span>
    </span>
  );
}

const deliveryStyles: Record<AdminDeliveryStatus, string> = {
  DELIVERED:
    "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  PENDING:
    "border border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  FAILED:
    "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  DEAD_LETTER:
    "border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300",
  PAUSED:
    "border border-border bg-muted text-muted-foreground",
};

export function AdminDeliveryStatusBadge({
  status,
}: {
  status: AdminDeliveryStatus;
}) {
  return (
    <span className={`${pillBase} ${deliveryStyles[status]}`}>
      <span className="capitalize">
        {status === "DEAD_LETTER" ? "Dead letter" : status.toLowerCase()}
      </span>
    </span>
  );
}

const incidentStyles: Record<AdminIncident["severity"], string> = {
  info: "border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  warning:
    "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  critical:
    "border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300",
};

export function IncidentSeverityBadge({
  severity,
}: {
  severity: AdminIncident["severity"];
}) {
  return (
    <span className={`${pillBase} ${incidentStyles[severity]}`}>
      <span className="capitalize">{severity}</span>
    </span>
  );
}

const configStyles: Record<AdminConfigStatusLevel, string> = {
  healthy:
    "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  warning:
    "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  down: "border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300",
};

export function ConfigStatusBadge({
  status,
}: {
  status: AdminConfigStatusLevel;
}) {
  return (
    <span className={`${pillBase} ${configStyles[status]}`}>
      <span className="capitalize">{status}</span>
    </span>
  );
}