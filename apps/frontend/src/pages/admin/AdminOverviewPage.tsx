import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBox,
  FiBriefcase,
  FiCreditCard,
  FiUsers,
} from "react-icons/fi";
import {
  EmptyState,
  StatCard,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import {
  PaymentStatusBadge,
  PlanBadge,
} from "../../components/admin/badges";
import type { AdminOverviewData } from "../../types/admin";
import { formatInr } from "../../lib/format";
import { timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as adminService from "../../api/services/adminMockService";

function AdminOverviewPage() {
  useDocumentMeta({
    title: "Admin overview",
    description: "Platform-wide delivery, billing and growth metrics for Relayo.",
  });

  const [data, setData] = useState<AdminOverviewData | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminService
      .getAdminOverview()
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((error) => {
        console.error("Error fetching admin overview:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform overview
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Health, growth and billing across every Relayo organization.
          </p>
        </div>
        <Link
          to="/admin/dashboard/organizations"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Manage organizations <FiArrowRight aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Organizations"
          value={data?.stats.totalOrganizations ?? "—"}
          hint={
            data
              ? `${data.stats.activeOrganizations} active · ${data.stats.suspendedOrganizations} suspended`
              : undefined
          }
          icon={<FiBriefcase />}
        />
        <StatCard
          label="Users"
          value={data?.stats.totalUsers ?? "—"}
          hint="Registered platform accounts"
          icon={<FiUsers />}
        />
        <StatCard
          label="Events · 24h"
          value={data ? data.stats.events24h.toLocaleString("en-IN") : "—"}
          hint="Across all organizations"
          icon={<FiBox />}
        />
        <StatCard
          label="MRR"
          value={data ? formatInr(data.stats.mrr) : "—"}
          tone="success"
          hint={`${data?.stats.successRatePct ?? "—"}% delivery success wins`}
          icon={<FiCreditCard />}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.8fr]">
        <section aria-labelledby="by-plan-heading">
          <h2
            id="by-plan-heading"
            className="mb-3 font-display text-base font-semibold text-foreground"
          >
            Organizations by plan
          </h2>
          {data && data.organizationsByPlan.length > 0 ? (
            <ul className="space-y-3">
              {data.organizationsByPlan.map(({ plan, count }) => (
                <li
                  key={plan}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
                >
                  <PlanBadge plan={plan} />
                  <span className="text-sm font-medium text-foreground">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<FiBriefcase />}
              title="No organizations yet"
              description="Data appears as soon as the first organization signs up."
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Plans are one-time — each paid period lasts 30 days before an
            organization drops back to Free.
          </p>
        </section>

        <section aria-labelledby="recent-payments-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="recent-payments-heading"
              className="font-display text-base font-semibold text-foreground"
            >
              Recent payments
            </h2>
            <Link
              to="/admin/dashboard/billing"
              className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
            >
              View all
            </Link>
          </div>

          {data && data.recentPayments.length === 0 ? (
            <EmptyState
              icon={<FiCreditCard />}
              title="No recent payments"
              description="Payments will appear here once organizations upgrade."
            />
          ) : (
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Organization</TH>
                  <TH>Plan</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH className="text-right">When</TH>
                </TR>
              </THead>
              <tbody>
                {(data?.recentPayments ?? []).map((payment) => (
                  <TR key={payment.id}>
                    <TD className="max-w-45 truncate font-medium">
                      {payment.organizationName}
                    </TD>
                    <TD>
                      <PlanBadge plan={payment.plan} />
                    </TD>
                    <TD className="font-mono text-xs">
                      {formatInr(payment.amount)}
                    </TD>
                    <TD>
                      <PaymentStatusBadge status={payment.status} />
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {timeAgo(payment.paidAt)}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminOverviewPage;