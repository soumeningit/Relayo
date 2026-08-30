import { useEffect, useState } from "react";
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
import { Pagination } from "../../components/dashboard/Pagination";
import { AdminDeliveryStatusBadge } from "../../components/admin/badges";
import type {
  AdminDelivery,
  AdminDeliveryStatus,
  AdminDeliverySummary,
} from "../../types/admin";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "../../types/pagination";
import { formatLatency, timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import * as opsService from "../../api/services/adminApi";

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

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

const emptySummary: AdminDeliverySummary = { total: 0, pending: 0, failed: 0 };

function AdminDeliveriesPage() {
  useDocumentMeta({
    title: "Deliveries",
    description: "Inspect every webhook delivery across the platform.",
  });

  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<AdminDelivery[] | null>(null);
  const [status, setStatus] = useState<AdminDeliveryStatus | "all">("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [summary, setSummary] =
    useState<AdminDeliverySummary>(emptySummary);

  useEffect(() => {
    let cancelled = false;

    opsService
      .listAdminDeliveries(
        {
          status: status === "all" ? undefined : status,
          search: debouncedQuery || undefined,
        },
        { page, pageSize },
      )
      .then((result) => {
        if (cancelled) return;
        setDeliveries(result.items);
        setPagination(result.pagination);
        setSummary(result.summary);
        if (result.items.length === 0 && result.pagination.total > 0) {
          setPage(1);
        }
      })
      .catch((error) => {
        console.error("Error fetching deliveries:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, status, page, pageSize]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

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
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Org, event, host…"
            className="w-full sm:w-64"
          />
          <select
            aria-label="Filter deliveries"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminDeliveryStatus | "all");
              setPage(1);
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
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">
            {summary.total.toLocaleString("en-IN")}
          </span>{" "}
          deliveries
        </span>
        <span>
          <span className="font-semibold text-amber-500">
            {summary.pending}
          </span>{" "}
          pending
        </span>
        <span>
          <span className="font-semibold text-red-500">{summary.failed}</span>{" "}
          failed or dead-lettered
        </span>
      </div>

      <div className="mt-5">
        {deliveries === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : deliveries.length === 0 && pagination.total === 0 ? (
          <EmptyState
            icon={<FiSearch />}
            title="No deliveries match"
            description="Try a different query or status filter."
          />
        ) : (
          <>
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
              {deliveries.map((delivery) => (
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
          {pagination.total > 0 && (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              hasMore={pagination.hasMore}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDeliveriesPage;