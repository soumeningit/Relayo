import { useEffect, useMemo, useState } from "react";
import { FiActivity, FiAlertTriangle, FiTrendingUp } from "react-icons/fi";
import { Card, EmptyState, Spinner, TD, TH, THead, TR, TableWrapper } from "../../components/ui";
import { QuotaBar } from "../../components/admin/charts";
import { OrgStatusBadge, PlanBadge } from "../../components/admin/badges";
import type { AdminUsageSummary } from "../../types/admin";
import { formatDate } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as opsService from "../../api/services/adminApi";

const compact = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
};

function AdminUsagePage() {
  useDocumentMeta({
    title: "Usage",
    description: "Event usage against each plan limit.",
  });

  const [usage, setUsage] = useState<AdminUsageSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    opsService
      .getAdminUsage()
      .then((result) => {
        if (!cancelled) setUsage(result);
      })
      .catch((error) => {
        console.error("Error fetching usage:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const list = usage ?? [];
    return {
      nearLimit: list.filter(
        (item) => item.quota !== null && item.used / item.quota >= 0.75,
      ).length,
      totalEvents: list.reduce((sum, item) => sum + item.used, 0),
      atCapacity: list.filter(
        (item) => item.quota !== null && item.used / item.quota >= 0.9,
      ).length,
    };
  }, [usage]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Usage
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Event usage against each organization&apos;s plan limit.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Near limit
            </p>
            <FiAlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
            {summary.nearLimit}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">at ≥ 75% used</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              At capacity
            </p>
            <FiTrendingUp className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
            {summary.atCapacity}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">at ≥ 90% used</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total events this cycle
            </p>
            <FiActivity className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
            {compact(summary.totalEvents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">across all plans</p>
        </Card>
      </div>

      <div className="mt-6">
        {usage === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : usage.length === 0 ? (
          <EmptyState
            icon={<FiTrendingUp />}
            title="No usage data"
            description="Usage appears once organizations start ingesting events."
          />
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Organization</TH>
                <TH>Plan</TH>
                <TH>Usage</TH>
                <TH>Limit</TH>
                <TH>Period ends</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <tbody>
              {usage.map((item) => (
                <TR key={item.organizationId}>
                  <TD className="min-w-44">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {item.organizationName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      relayo.app/{item.slug}
                    </span>
                  </TD>
                  <TD>
                    <PlanBadge plan={item.plan} />
                  </TD>
                  <TD className="min-w-56">
                    <QuotaBar
                      used={item.used}
                      quota={item.quota}
                      formatUsed={compact}
                      formatQuota={compact}
                    />
                  </TD>
                  <TD className="font-mono text-xs text-muted-foreground">
                    {item.quota === null ? "Unlimited" : compact(item.quota)}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {formatDate(item.periodEnd)}
                  </TD>
                  <TD>
                    <OrgStatusBadge status={item.status} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </div>
    </div>
  );
}

export default AdminUsagePage;