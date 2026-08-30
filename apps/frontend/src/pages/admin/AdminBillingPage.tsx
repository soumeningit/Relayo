import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiCreditCard,
  FiMoreHorizontal,
  FiRotateCcw,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  Card,
  ConfirmDialog,
  EmptyState,
  Spinner,
  StatCard,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { DropdownMenu, MenuItem } from "../../components/ui/DropdownMenu";
import { AdminChart } from "../../components/admin/charts";
import { PaymentStatusBadge, PlanBadge } from "../../components/admin/badges";
import type {
  AdminExpiredOrganization,
  AdminPayment,
  AdminPaymentStatus,
  AdminRevenueData,
} from "../../types/admin";
import { formatInr } from "../../lib/format";
import { formatDate } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as adminService from "../../api/services/adminApi";

const selectClasses =
  "h-10 rounded-xl border border-border bg-input px-3.5 text-sm text-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const statusOptions: { value: AdminPaymentStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

type PaymentAction = { type: "refund"; payment: AdminPayment } | null;

function AdminBillingPage() {
  useDocumentMeta({
    title: "Billing",
    description: "Revenue, churn and payments across every organization.",
  });

  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [revenue, setRevenue] = useState<AdminRevenueData | null>(null);
  const [expired, setExpired] = useState<AdminExpiredOrganization[]>([]);
  const [status, setStatus] = useState<AdminPaymentStatus | "all">("all");
  const [confirmation, setConfirmation] = useState<PaymentAction>(null);
  const [busy, setBusy] = useState(false);

  const refreshPayments = (selected: string | null = null) => {
    adminService
      .listAdminPayments((selected ?? status) as AdminPaymentStatus | "all")
      .then((result) => setPayments(result))
      .catch((error) => {
        console.error("Error fetching payments:", error);
      });
  };

  useEffect(() => {
    let cancelled = false;

    adminService.listAdminPayments().then((result) => {
      if (!cancelled) setPayments(result);
    });

    adminService.getAdminRevenue().then((result) => {
      if (!cancelled) setRevenue(result);
    });

    adminService.listExpiredOrganizations().then((result) => {
      if (!cancelled) setExpired(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const list = payments ?? [];
    const paid = list.filter((payment) => payment.status === "paid");
    const collected = paid.reduce((sum, payment) => sum + payment.amount, 0);
    return {
      collected,
      average: paid.length > 0 ? Math.round(collected / paid.length) : 0,
      failed: list.filter((payment) => payment.status === "failed").length,
      refunded: list
        .filter((payment) => payment.status === "refunded")
        .reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [payments]);

  const rows = useMemo(() => {
    const list = payments ?? [];
    if (status === "all") return list;
    return list.filter((payment) => payment.status === status);
  }, [payments, status]);

  const maxByPlan = Math.max(
    1,
    ...(revenue?.byPlan ?? []).map((item) => item.collected),
  );

  const runConfirmation = async () => {
    if (!confirmation) return;
    const payment = confirmation.payment;
    setBusy(true);
    try {
      const updated =
        confirmation.type === "refund"
          ? await adminService.refundPayment(payment.id)
          : await adminService.retryPayment(payment.id);
      setPayments((prev) =>
        prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : prev,
      );
      toast.success(
        confirmation.type === "refund"
          ? `${payment.id} was refunded.`
          : `${payment.id} was charged successfully.`,
      );
      setConfirmation(null);
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error("Could not update the payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Billing
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Revenue, churn and one-time plan purchases.
          </p>
        </div>
        <select
          aria-label="Filter payments"
          value={status}
          onChange={(event) => {
            const next = event.target.value as AdminPaymentStatus | "all";
            setStatus(next);
            refreshPayments(next);
          }}
          className={selectClasses}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collected"
          value={revenue ? formatInr(revenue.collectedTotal) : "—"}
          tone="success"
          hint="Successful payments"
          icon={<FiArrowDownCircle />}
        />
        <StatCard
          label="Refunded"
          value={revenue ? formatInr(revenue.refundedTotal) : "—"}
          hint="Returned to customers"
          icon={<FiRotateCcw />}
        />
        <StatCard
          label="Avg per paid"
          value={payments ? formatInr(summary.average) : "—"}
          hint="Across successful payments"
          icon={<FiTrendingUp />}
        />
        <StatCard
          label="Failed payments"
          value={payments ? summary.failed : "—"}
          tone="danger"
          hint="Action required"
          icon={<FiAlertTriangle />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Collected vs refunded
          </h2>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <div className="mt-4">
            {revenue ? (
              <AdminChart
                formatter={(value) => formatInr(value)}
                series={[
                  {
                    name: "Collected",
                    color: "#10b981",
                    data: revenue.series.map((point) => point.collected),
                  },
                  {
                    name: "Refunded",
                    color: "#ef4444",
                    data: revenue.series.map((point) => point.refunded),
                  },
                ]}
              />
            ) : (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6 text-indigo-500" />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">
            By plan
          </h2>
          <p className="text-xs text-muted-foreground">
            Collected revenue per plan
          </p>
          <ul className="mt-4 space-y-4">
            {(revenue?.byPlan ?? []).map((item) => (
              <li key={item.plan}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatInr(item.collected)} · {item.count} payments
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, (item.collected / maxByPlan) * 100)}%`,
                      backgroundColor:
                        item.plan === "SCALE"
                          ? "#8b5cf6"
                          : item.plan === "PRO"
                            ? "#6366f1"
                            : "#94a3b8",
                    }}
                  />
                </div>
              </li>
            ))}
            {(revenue?.byPlan ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No paid plans yet.
              </p>
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Expired or churned organizations
              </h2>
              <p className="text-xs text-muted-foreground">
                Subscriptions past their payment or plan period.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {expired.length} affected
            </span>
          </div>
          {expired.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No expired organizations right now.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Organization
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Previous plan
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Last paid
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expired.map((org) => (
                    <tr
                      key={org.organizationId}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-3.5">
                        <span className="block font-medium text-foreground">
                          {org.organizationName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          relayo.app/{org.slug}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <PlanBadge plan={org.previousPlan} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {formatDate(org.lastPaidAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-300">
                          <FiTrendingDown className="h-3 w-3" aria-hidden="true" />
                          Expired
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8">
        {payments === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FiCreditCard />}
            title="No payments match"
            description={
              status === "all"
                ? "Payments appear here once an organization upgrades."
                : "No payments have this status."
            }
          />
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Organization</TH>
                <TH>Plan</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH className="text-right">Paid</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {rows.map((payment) => (
                <TR key={payment.id}>
                  <TD className="max-w-45 truncate font-medium">
                    {payment.organizationName}
                  </TD>
                  <TD>
                    <PlanBadge plan={payment.plan} />
                  </TD>
                  <TD className="font-mono text-xs">{formatInr(payment.amount)}</TD>
                  <TD>
                    <PaymentStatusBadge status={payment.status} />
                  </TD>
                  <TD className="text-right text-xs text-muted-foreground">
                    {formatDate(payment.paidAt)}
                  </TD>
                  <TD className="text-right">
                    {payment.status === "paid" || payment.status === "failed" ? (
                      <DropdownMenu
                        trigger={
                          <button
                            aria-label={`Manage ${payment.id}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <FiMoreHorizontal aria-hidden="true" />
                          </button>
                        }
                      >
                        {(close) => (
                          <>
                            {payment.status === "paid" && (
                              <MenuItem
                                icon={<FiRotateCcw size={15} />}
                                danger
                                onClick={() => {
                                  close();
                                  setConfirmation({
                                    type: "refund",
                                    payment,
                                  });
                                }}
                              >
                                Refund
                              </MenuItem>
                            )}
                            {payment.status === "failed" && (
                              <MenuItem
                                icon={<FiArrowUpCircle size={15} />}
                                onClick={() => {
                                  close();
                                  adminService.retryPayment(payment.id).then(
                                    (updated) => {
                                      setPayments((prev) =>
                                        prev
                                          ? prev.map((item) =>
                                              item.id === updated.id ? updated : item,
                                            )
                                          : prev,
                                      );
                                      toast.success(
                                        `${payment.id} was charged successfully.`,
                                      );
                                    },
                                  );
                                }}
                              >
                                Retry payment
                              </MenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenu>
                    ) : (
                      <span className="sr-only">No actions</span>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </div>

      <ConfirmDialog
        open={confirmation !== null}
        onClose={() => {
          if (!busy) setConfirmation(null);
        }}
        onConfirm={runConfirmation}
        title="Refund payment"
        message={`Refund ${confirmation?.payment.id} (${formatInr(
          confirmation?.payment.amount ?? 0,
        )}) for ${confirmation?.payment.organizationName ?? ""}? The customer will be credited automatically.`}
        confirmLabel="Refund"
        isLoading={busy}
      />
    </div>
  );
}

export default AdminBillingPage;