import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiZap } from "react-icons/fi";
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
import type { AdminEvent } from "../../types/admin";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "../../types/pagination";
import { timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import * as opsService from "../../api/services/adminApi";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

function AdminEventsPage() {
  useDocumentMeta({
    title: "Events",
    description: "Inspect every event ingested by the platform.",
  });

  const navigate = useNavigate();
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);

  useEffect(() => {
    let cancelled = false;

    opsService
      .listAdminEvents(
        { search: debouncedQuery || undefined },
        { page, pageSize },
      )
      .then((result) => {
        if (cancelled) return;
        setEvents(result.items);
        setPagination(result.pagination);
        if (result.items.length === 0 && result.pagination.total > 0) {
          setPage(1);
        }
      })
      .catch((error) => {
        console.error("Error fetching events:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, pageSize]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Events
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every event ingested by the platform.
          </p>
        </div>
        <AdminSearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Org, type, event ID…"
          className="w-full sm:w-64"
        />
      </div>

      <div className="mt-5">
        {events === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : events.length === 0 && pagination.total === 0 ? (
          <EmptyState
            icon={<FiSearch />}
            title="No events match"
            description="Try a different query."
          />
        ) : (
          <>
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Event</TH>
                  <TH>Organization</TH>
                  <TH className="text-right">Created</TH>
                </TR>
              </THead>
              <tbody>
                {events.map((event) => (
                  <TR
                    key={event.id}
                    onClick={() =>
                      navigate(`/admin/dashboard/events/${event.id}`)
                    }
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/12 text-indigo-500 dark:text-indigo-300">
                          <FiZap className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs font-medium text-foreground">
                            {event.eventType}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">
                            {event.id}
                          </span>
                        </span>
                      </div>
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {event.organizationName}
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {timeAgo(event.createdAt)}
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

export default AdminEventsPage;