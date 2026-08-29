import { FiAlertTriangle, FiCheckCircle, FiInfo } from "react-icons/fi";
import type { AdminIncident } from "../../types/admin";
import { timeAgo } from "../../lib/time";

const banners: Record<
  AdminIncident["severity"],
  { icon: typeof FiInfo; classes: string; bar: string }
> = {
  info: {
    icon: FiInfo,
    classes: "border-sky-500/25 bg-sky-500/8 text-sky-200",
    bar: "bg-sky-400",
  },
  warning: {
    icon: FiAlertTriangle,
    classes: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    bar: "bg-amber-400",
  },
  critical: {
    icon: FiAlertTriangle,
    classes: "border-red-500/25 bg-red-500/10 text-red-200",
    bar: "bg-red-500",
  },
};

export function IncidentBanner({
  incidents,
}: {
  incidents: AdminIncident[] | null;
}) {
  if (!incidents || incidents.length === 0) return null;

  const open = incidents.filter((incident) => incident.status === "open");
  if (open.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
        <span className="inline-flex items-center gap-2">
          <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium">All systems operational</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {open.map((incident) => {
        const { icon: Icon, classes, bar } = banners[incident.severity];
        return (
          <div
            key={incident.id}
            className={`relative overflow-hidden rounded-xl border px-4 py-3 ${classes}`}
          >
            <span
              className={`absolute inset-y-0 left-0 w-1 ${bar}`}
              aria-hidden="true"
            />
            <div className="flex items-start gap-3 pl-2">
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 opacity-90"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {incident.title}
                </p>
                <p className="mt-0.5 text-xs opacity-85">{incident.message}</p>
              </div>
              <span className="ml-auto shrink-0 text-xs whitespace-nowrap opacity-70">
                {timeAgo(incident.startedAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}