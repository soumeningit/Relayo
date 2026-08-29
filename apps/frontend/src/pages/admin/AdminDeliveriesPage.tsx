import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLayers, FiSearch } from "react-icons/fi";
import {
  EmptyState,
  Spinner,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { AdminSearchInput } from "../../components/admin/SearchInput";
import { AdminDeliveryStatusBadge } from "../../components/admin/badges";
import type { AdminDelivery, AdminDeliveryStatus } from "../../types/admin";
import { formatLatency, timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as opsService from "../../api/services/adminOpsService";

const selectClasses =
  "h-10 rounded-xl border border-border bg-input px-3.5 text-sm text-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const statusOptions: { value: AdminDeliveryStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "DEAD_LETTER", label: "Dead letter" },
  { value: "PAUSED", label: "Paused" },
];

function AdminDeliveriesPage() {
  useDocumentMeta({
    title: "Deliveries",
    description: "Inspect every webhook delivery across the platform.",
  });

  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<AdminDelivery[] | null>(null);
  const [status, setStatus] = useState<AdminDeliveryStatus | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    opsService
      .listAdminDeliveries()
      .then((result) => {
        if (!cancelled) setDeliveries(result);
      })
      .catch((error) => {
        console.error("Error fetching deliveries:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const list = deliveries ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((delivery) => {
      if (status !== "all" && delivery.status !== status) return false;
      if (!q) return true;
      return (
        delivery.organizationName.toLowerCase().includes(q) ||
        delivery.eventType.toLowerCase().includes(q) ||
        delivery.destinationHost.toLowerCase().includes(q) ||
        delivery.id.toLowerCase().includes(q)
      );
    });
  }, [deliveries, status, query]);

  const counts = useMemo(() => {
    const list = deliveries ?? [];
    return {
      total: list.length,
      failed: list.filter(
        (delivery) =>
          delivery.status === "FAILED" || delivery.status === "DEAD_LETTER",
      ).length,
      pending: list.filter((delivery) => delivery.status === "PENDING").length,
    };
  }, [deliveries]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Deliveries
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every webhook delivery attempt across the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Org, event, host…"
            className="w-full sm:w-64"
          />
          <select
            aria-label="Filter deliveries"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AdminDeliveryStatus | "all")
            }
            className={selectClasses}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">
            {counts.total.toLocaleString("en-IN")}
          </span>{" "}
          deliveries
        </span>
        <span>
          <span className="font-semibold text-amber-500">
            {counts.pending}
          </span>{" "}
          pending
        </span>
        <span>
          <span className="font-semibold text-red-500">{counts.failed}</span>{" "}
          failed or dead-lettered
        </span>
      </div>

      <div className="mt-5">
        {deliveries === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FiSearch />}
            title="No deliveries match"
            description="Try a different query or status filter."
          />
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Delivery</TH>
                <TH>Event</TH>
                <TH>Destination</TH>
                <TH>Status</TH>
                <TH>Attempts</TH>
                <TH>Last code</TH>
                <TH>Latency</TH>
                <TH className="text-right">Updated</TH>
              </TR>
            </THead>
            <tbody>
              {rows.map((delivery) => (
                <TR
                  key={delivery.id}
                  onClick={() =>
                    navigate(`/admin/dashboard/deliveries/${delivery.id}`)
                  }
                >
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/12 text-indigo-500 dark:text-indigo-300">
                        <FiLayers className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs font-medium text-foreground">
                          {delivery.id}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {delivery.organizationName}
                        </span>
                      </span>
                    </div>
                  </TD>
                  <TD className="font-mono text-xs text-foreground">
                    {delivery.eventType}
                  </TD>
                  <TD className="max-w-40 truncate text-xs text-muted-foreground">
                    {delivery.destinationHost}
                  </TD>
                  <TD>
                    <AdminDeliveryStatusBadge status={delivery.status} />
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {delivery.attempts.length}
                  </TD>
                  <TD
                    className={`font-mono text-xs ${
                      delivery.lastResponseCode && delivery.lastResponseCode >= 400
                        ? "text-red-500"
                        : "text-emerald-600 dark:text-emerald-300"
                    }`}
                  >
                    {delivery.lastResponseCode ?? "—"}
                  </TD>
                  <TD className="font-mono text-xs text-muted-foreground">
                    {formatLatency(delivery.latencyMs)}
                  </TD>
                  <TD className="text-right text-xs text-muted-foreground">
                    {timeAgo(delivery.updatedAt)}
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

export default AdminDeliveriesPage;