import { useEffect, useState } from "react";
import { FiAlertTriangle, FiRotateCw } from "react-icons/fi";
import { toast } from "sonner";
import { Button, EmptyState } from "../../components/ui";
import { DeliveryTable } from "../../components/dashboard/DeliveryTable";
import { Pagination } from "../../components/dashboard/Pagination";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as deliveryService from "../../api/services/DeliveryService";
import { useTenant } from "../../contexts/TenantContext";
import type { DeliveryRow } from "../../types/dashboard";
import type { PaginationMeta } from "../../types/pagination";
import { DEFAULT_PAGE_SIZE } from "../../types/pagination";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

function FailedDeliveriesPage() {
  useDocumentMeta({
    title: "Failed Deliveries",
    description:
      "Deliveries that exhausted all retries. Replay them once endpoints recover.",
  });

  const { tenant } = useTenant();

  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    setIsLoading(true);

    deliveryService
      .listDeliveries(tenant.id, {
        status: "dead_letter",
        page,
        pageSize,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.items);
        setPagination(res.pagination);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenant, page, pageSize, reloadKey]);

  const handleReplay = async (row: DeliveryRow) => {
    if (!tenant) return;
    setReplayingId(row.id);
    try {
      await deliveryService.replayDelivery(tenant.id, row.id);
      toast.success(`Replay queued for ${row.eventType}`);
      setReloadKey((key) => key + 1);
    } catch {
      toast.error("Replay failed — try again");
    } finally {
      setReplayingId(null);
    }
  };

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Failed Deliveries
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Deliveries that exhausted all retries. Nothing is lost — replay when
            ready.
          </p>
        </div>
        {pagination.total > 0 && (
          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-300">
            {pagination.total} awaiting replay
          </span>
        )}
      </div>

      <div className="mt-6">
        {rows.length === 0 && !isLoading ? (
          <EmptyState
            icon={<FiAlertTriangle />}
            title="No failed deliveries"
            description="Great news — every event either delivered or is still retrying."
          />
        ) : (
          <>
            <DeliveryTable
              rows={rows}
              renderAction={(row) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReplay(row)}
                  isLoading={replayingId === row.id}
                  disabled={replayingId !== null && replayingId !== row.id}
                  aria-label={`Replay delivery ${row.id}`}
                >
                  <FiRotateCw aria-hidden="true" /> Replay
                </Button>
              )}
            />
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

export default FailedDeliveriesPage;