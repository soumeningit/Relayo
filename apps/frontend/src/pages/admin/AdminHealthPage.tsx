import { useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiRefreshCw,
  FiServer,
  FiZap,
} from "react-icons/fi";
import { Card, Spinner, StatCard, TableWrapper, THead, TR, TH, TD } from "../../components/ui";
import { AdminChart } from "../../components/admin/charts";
import { IncidentBanner } from "../../components/admin/IncidentBanner";
import {
  ConfigStatusBadge,
  IncidentSeverityBadge,
} from "../../components/admin/badges";
import type { AdminConfigStatus, AdminHealth } from "../../types/admin";
import { timeAgo, formatLatency } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as opsService from "../../api/services/adminOpsService";

function AdminHealthPage() {
  useDocumentMeta({
    title: "Platform health",
    description: "Live platform metrics, queues and operational incidents.",
  });

  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [config, setConfig] = useState<AdminConfigStatus[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    opsService
      .getAdminHealth()
      .then((result) => {
        if (!cancelled) setHealth(result);
      })
      .catch((error) => {
        console.error("Error fetching platform health:", error);
      });

    opsService
      .getConfigStatus()
      .then((result) => {
        if (!cancelled) setConfig(result);
      })
      .catch((error) => {
        console.error("Error fetching config status:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!health || !config) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const degraded = config.some((item) => item.status !== "healthy");
  const jobsPerSecond = health.queues.reduce(
    (sum, queue) => sum + queue.jobsPerSecond,
    0,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform health
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Live metrics, queues and incidents across the platform.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
            degraded
              ? "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              degraded ? "bg-amber-500" : "bg-emerald-500"
            }`}
            aria-hidden="true"
          />
          {degraded ? "Degraded" : "All systems operational"}
        </span>
      </div>

      <div className="mt-6">
        <IncidentBanner incidents={health.incidents} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Events / min"
          value={health.metrics.eventsPerMinute.toLocaleString("en-IN")}
          icon={<FiZap />}
          hint="Ingested last 60s"
        />
        <StatCard
          label="Delivered / min"
          value={health.metrics.deliveredPerMinute.toLocaleString("en-IN")}
          icon={<FiCheckCircle />}
          tone="success"
          hint={`${health.metrics.attemptsPerMinute.toLocaleString("en-IN")} attempts`}
        />
        <StatCard
          label="p95 latency"
          value={formatLatency(health.metrics.p95LatencyMs)}
          icon={<FiClock />}
          hint="Delivery round-trip"
        />
        <StatCard
          label="Error rate"
          value={`${health.metrics.errorRatePct}%`}
          icon={<FiAlertTriangle />}
          tone={health.metrics.errorRatePct > 2 ? "danger" : "default"}
          hint="tailed over 10m"
        />
        <StatCard
          label="Queue depth"
          value={health.metrics.queueDepth.toLocaleString("en-IN")}
          icon={<FiDatabase />}
          hint={`${jobsPerSecond} jobs/s`}
          tone={
            health.metrics.queueDepth > 1000
              ? "warning"
              : "default"
          }
        />
        <StatCard
          label="Dead letters"
          value={health.metrics.deadLetter30d}
          icon={<FiAlertCircle />}
          tone={health.metrics.deadLetter30d > 30 ? "warning" : "default"}
          hint={`${health.metrics.deadLetterTotal} total`}
        />
        <StatCard
          label="Circuit breakers"
          value={health.metrics.openCircuitBreakers}
          icon={<FiRefreshCw />}
          tone={health.metrics.openCircuitBreakers > 0 ? "danger" : "success"}
          hint="Currently open"
        />
        <StatCard
          label="Redis"
          value={`${health.metrics.redisMemoryMb} MB`}
          icon={<FiServer />}
          hint={health.metrics.redisRegion}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Event ingestion
          </h2>
          <p className="text-xs text-muted-foreground">Last 2 hours · per minute</p>
          <div className="mt-4">
            <AdminChart
              formatter={(value) => `${value.toLocaleString("en-IN")} evt`}
              series={[
                {
                  name: "Events / min",
                  color: "#6366f1",
                  data: health.series.map((point) => point.eventsPerMinute),
                },
              ]}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Error rate</h2>
          <p className="text-xs text-muted-foreground">
            Last 2 hours · % of attempts
          </p>
          <div className="mt-4">
            <AdminChart
              formatter={(value) => `${value}%`}
              series={[
                {
                  name: "Error rate",
                  color: "#f59e0b",
                  data: health.series.map((point) => point.errorRatePct),
                },
              ]}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-sm font-semibold text-foreground">Worker queues</h2>
            <span className="text-xs text-muted-foreground">
              {health.metrics.workerCount} workers running
            </span>
          </div>
          <div className="mt-3">
            <TableWrapper>
              <THead>
              <TR>
                <TH>Queue</TH>
                <TH>Depth</TH>
                <TH>Processed</TH>
                <TH>Jobs / s</TH>
                <TH>Stalled</TH>
                <TH>Health</TH>
                <TH>Note</TH>
              </TR>
            </THead>
            <tbody>
              {health.queues.map((queue) => (
                <TR key={queue.name}>
                  <TD className="font-mono text-xs font-medium text-foreground">
                    {queue.name}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {queue.depth.toLocaleString("en-IN")}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {queue.processed.toLocaleString("en-IN")}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {queue.jobsPerSecond}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {queue.stalled}
                  </TD>
                  <TD>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        queue.healthy
                          ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          queue.healthy ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        aria-hidden="true"
                      />
                      {queue.healthy ? "Healthy" : "Degraded"}
                    </span>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{queue.note}</TD>
                </TR>
              ))}
            </tbody>
            </TableWrapper>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Provider & dependency status
          </h2>
          <ul className="mt-3 divide-y divide-border/70">
            {config.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                <ConfigStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Recent incidents
          </h2>
          <ul className="mt-3 divide-y divide-border/70">
            {health.incidents.map((incident) => (
              <li key={incident.id} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <IncidentSeverityBadge severity={incident.severity} />
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FiClock aria-hidden="true" />
                    {incident.status === "open"
                      ? `${timeAgo(incident.startedAt)} · open`
                      : `resolved ${timeAgo(incident.resolvedAt ?? incident.startedAt)}`}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground">
                  {incident.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {incident.message}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default AdminHealthPage;