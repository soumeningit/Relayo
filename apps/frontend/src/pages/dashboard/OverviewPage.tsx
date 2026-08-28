import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiCheckCircle,
  FiMapPin,
  FiRefreshCw,
} from "react-icons/fi";
import {
  DeliveryStatusBadge,
  DestinationStatusBadge,
  EmptyState,
  StatCard,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { Button } from "../../components/ui/Button";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as dashboardService from "../../api/services/DashboardService";
import { useTenant } from "../../contexts/TenantContext";
import type {
  DashboardStats,
  DeliveryRow,
  Destination,
} from "../../types/dashboard";
import { timeAgo } from "../../lib/time";

function OverviewPage() {
  useDocumentMeta({
    title: "Overview",
    description: "Relayo delivery dashboard overview.",
  });

  const { tenant } = useTenant();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [recent, setRecent] = useState<DeliveryRow[]>([]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;

    dashboardService
      .getOverview(tenant.id)
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats);
        setDestinations(data.destinations);
        setRecent(data.recent.slice(0, 8));
      })
      .catch((error) => {
        console.error("Error fetching overview:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [tenant]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Overview
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Delivery health across all your destinations.
          </p>
        </div>
        <Button size="sm">
          <Link
            to="/dashboard/events"
            className="inline-flex items-center gap-1.5"
          >
            View events <FiArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Events · 24h"
          value={stats?.eventsLast24h ?? "—"}
          icon={<FiBox />}
        />
        <StatCard
          label="Success rate"
          value={stats ? `${stats.successRatePct}%` : "—"}
          tone={
            stats && stats.successRatePct >= 95
              ? "success"
              : stats && stats.successRatePct < 80
                ? "danger"
                : "warning"
          }
          icon={<FiCheckCircle />}
        />
        <StatCard
          label="Pending retries"
          value={stats?.pendingRetries ?? "—"}
          tone="warning"
          hint="Backoff in progress"
          icon={<FiRefreshCw />}
        />
        <StatCard
          label="Dead-lettered"
          value={stats?.deadLettered ?? "—"}
          tone={stats && stats.deadLettered > 0 ? "danger" : "default"}
          icon={<FiAlertTriangle />}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        {/* Destination health */}
        <section aria-labelledby="health-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="health-heading"
              className="font-display text-base font-semibold text-foreground"
            >
              Destination health
            </h2>
            <Link
              to="/dashboard/destinations"
              className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
            >
              Manage
            </Link>
          </div>
          {destinations.length === 0 ? (
            <EmptyState
              icon={<FiMapPin />}
              title="No destinations yet"
              description="Register your first endpoint to start delivering events."
            />
          ) : (
            <ul className="space-y-3">
              {destinations.map((destination) => (
                <li key={destination.id}>
                  <Link
                    to={`/dashboard/destinations/${destination.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-indigo-400/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {new URL(destination.url).host}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {destination.url}
                      </span>
                    </span>
                    <DestinationStatusBadge status={destination.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent deliveries */}
        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="recent-heading"
              className="font-display text-base font-semibold text-foreground"
            >
              Recent deliveries
            </h2>
            <Link
              to="/dashboard/deliveries"
              className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
            >
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="No deliveries yet"
              description="Send your first event and watch it flow through the pipeline."
            />
          ) : (
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Event</TH>
                  <TH>Destination</TH>
                  <TH>Status</TH>
                  <TH className="text-right">When</TH>
                </TR>
              </THead>
              <tbody>
                {recent.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-mono text-xs">{row.eventType}</TD>
                    <TD className="max-w-45 truncate text-xs text-muted-foreground">
                      {(() => {
                        try {
                          return new URL(row.destinationUrl).host;
                        } catch {
                          return row.destinationUrl;
                        }
                      })()}
                    </TD>
                    <TD>
                      <DeliveryStatusBadge status={row.status} />
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {timeAgo(row.updatedAt)}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </section>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        At-least-once delivery — consumers should dedupe by event ID.
      </p>
    </div>
  );
}

export default OverviewPage;
