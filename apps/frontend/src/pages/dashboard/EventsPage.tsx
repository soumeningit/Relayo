import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiBox, FiSearch } from "react-icons/fi";
import {
  EmptyState,
  Input,
  PageLoader,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { Pagination } from "../../components/dashboard/Pagination";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as eventService from "../../api/services/EventService";
import { useTenant } from "../../contexts/TenantContext";
import { timeAgo } from "../../lib/time";
import type { Event } from "../../types/event";
import type { PaginationMeta } from "../../types/pagination";
import { DEFAULT_PAGE_SIZE } from "../../types/pagination";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

function EventsPage() {
  useDocumentMeta({
    title: "Events",
    description: "All events ingested by Relayo for your tenant.",
  });

  const { tenant } = useTenant();
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    setIsLoading(true);

    eventService
      .listEvents(tenant.id, { page, pageSize, search: debouncedQuery })
      .then((res) => {
        if (cancelled) return;
        setEvents(res.items);
        setPagination(res.pagination);
        if (res.items.length === 0 && res.pagination.total > 0) {
          setPage(1);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenant, page, pageSize, debouncedQuery]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  if (isLoading && events.length === 0) return <PageLoader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Events
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every event accepted by the ingestion API.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <Input
            type="search"
            placeholder="Search type or idempotency key…"
            aria-label="Search events"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            leftIcon={<FiSearch aria-hidden="true" />}
          />
        </div>
      </div>

      <div className="mt-6">
        {events.length === 0 && !isLoading ? (
          <EmptyState
            icon={<FiBox />}
            title={query ? "No matching events" : "No events yet"}
            description={
              query
                ? "Try a different search term."
                : "POST to /events and they'll show up here instantly."
            }
          />
        ) : (
          <>
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Event type</TH>
                  <TH>Idempotency key</TH>
                  <TH>Deliveries</TH>
                  <TH className="text-right">Created</TH>
                </TR>
              </THead>
              <tbody>
                {events.map((event) => (
                  <TR key={event.id}>
                    <TD>
                      <Link
                        to={`/dashboard/events/${event.id}`}
                        className="font-mono text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
                      >
                        {event.eventType}
                      </Link>
                    </TD>
                    <TD className="font-mono text-xs text-muted-foreground">
                      {event.idempotencyKey}
                    </TD>
                    <TD className="text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                        {event.deliveryCount ?? 0} destinations
                      </span>
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {timeAgo(event.createdAt)}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
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

export default EventsPage;