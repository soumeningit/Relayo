import { useEffect, useState } from "react";
import { FiFileText } from "react-icons/fi";
import { DeliveryStatusBadge, EmptyState } from "../../components/ui";
import { DeliveryTable } from "../../components/dashboard/DeliveryTable";
import { Pagination } from "../../components/dashboard/Pagination";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as deliveryService from "../../api/services/DeliveryService";
import * as destinationService from "../../api/services/DestinationService";
import type {
  DeliveryRow,
  Destination,
  DeliveryStatus,
} from "../../types/dashboard";
import type { PaginationMeta } from "../../types/pagination";
import { DEFAULT_PAGE_SIZE } from "../../types/pagination";
import { useTenant } from "../../contexts/TenantContext";

const statusOptions: { value: DeliveryStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "delivered", label: "Delivered" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Retrying" },
  { value: "dead_letter", label: "Dead letter" },
];

const selectClasses =
  "h-11 rounded-xl border border-border bg-input px-3.5 text-sm text-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

function DeliveriesPage() {
  useDocumentMeta({
    title: "Delivery logs",
    description:
      "Full audit trail of every delivery attempt Relayo made for your events.",
  });

  const { tenant } = useTenant();

  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [status, setStatus] = useState<DeliveryStatus | "">("");
  const [destinationId, setDestinationId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    destinationService
      .listDestinations(tenant.id)
      .then((data) => !cancelled && setDestinations(data))
      .catch((error) => {
        console.error("Error fetching destinations:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    setIsLoading(true);
    // Refetch whenever filters/pagination change
    deliveryService
      .listDeliveries(tenant.id, {
        destinationId: destinationId || undefined,
        status: status || undefined,
        page,
        pageSize,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.items);
        setPagination(res.pagination);
        if (res.items.length === 0 && res.pagination.total > 0) {
          setPage(1);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant, status, destinationId, page, pageSize]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Delivery logs
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every attempt, response code and latency — nothing hidden.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DeliveryStatus | "");
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
          <select
            aria-label="Filter by destination"
            value={destinationId}
            onChange={(event) => {
              setDestinationId(event.target.value);
              setPage(1);
            }}
            className={`${selectClasses} max-w-55`}
          >
            <option value="">All destinations</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {new URL(destination.url).host}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {rows.length === 0 && !isLoading ? (
          <EmptyState
            icon={<FiFileText />}
            title="No deliveries match"
            description="Adjust the filters or wait for new events to arrive."
          />
        ) : (
          <>
            <DeliveryTable rows={rows} />
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              Status legend: <DeliveryStatusBadge status="delivered" />{" "}
              <DeliveryStatusBadge status="failed" />{" "}
              <DeliveryStatusBadge status="dead_letter" />
            </p>
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              hasMore={pagination.hasMore}
              isLoading={isLoading}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default DeliveriesPage;