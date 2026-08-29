import { useEffect, useMemo, useState } from "react";
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
import type { AdminEvent } from "../../types/admin";
import { timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as opsService from "../../api/services/adminOpsService";

function AdminEventsPage() {
  useDocumentMeta({
    title: "Events",
    description: "Inspect every event ingested by the platform.",
  });

  const navigate = useNavigate();
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    opsService
      .listAdminEvents()
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch((error) => {
        console.error("Error fetching events:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const list = events ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (event) =>
        event.organizationName.toLowerCase().includes(q) ||
        event.eventType.toLowerCase().includes(q) ||
        event.id.toLowerCase().includes(q),
    );
  }, [events, query]);

  const eventTypes = useMemo(() => {
    const set = new Set((events ?? []).map((event) => event.eventType));
    return [...set].sort();
  }, [events]);

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
          onChange={setQuery}
          placeholder="Org, type, event ID…"
          className="w-full sm:w-64"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {eventTypes.slice(0, 12).map((type) => (
          <button
            key={type}
            onClick={() => setQuery(type)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
              query.trim().toLowerCase() === type
                ? "border-indigo-500/40 bg-indigo-500/12 text-indigo-600 dark:text-indigo-300"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {events === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FiSearch />}
            title="No events match"
            description="Try a different query."
          />
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Event</TH>
                <TH>Organization</TH>
                <TH className="text-right">Created</TH>
              </TR>
            </THead>
            <tbody>
              {rows.map((event) => (
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
        )}
      </div>
    </div>
  );
}

export default AdminEventsPage;