import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiBox } from "react-icons/fi";
import {
  Button,
  DeliveryStatusBadge,
  EmptyState,
  JsonBlock,
  PageLoader,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useTenant } from "../../contexts/TenantContext";

import { formatDate, timeAgo } from "../../lib/time";
import * as eventService from "../../api/services/EventService";
import type { Delivery, EventDetails } from "../../types/event";

function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !tenant) return;
    let cancelled = false;

    eventService.getEventDetails(tenant.id, id).then((data) => {
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
      } else {
        setEvent(data);
        setDeliveries(data.deliveries || []); // Populate deliveries from the single response
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, tenant]);

  useDocumentMeta({
    title: event ? event.eventType : "Event",
    description: "Event payload and delivery outcomes.",
  });

  if (notFound) {
    return (
      <EmptyState
        title="Event not found"
        action={
          <Link to="/dashboard/events">
            <Button variant="outline" size="sm">
              <FiArrowLeft aria-hidden="true" /> Back to events
            </Button>
          </Link>
        }
      />
    );
  }

  if (!event) return <PageLoader />;

  return (
    <div>
      <Link
        to="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <FiArrowLeft aria-hidden="true" /> All events
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {event.eventType}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Idempotency key{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {event.idempotencyKey}
            </code>
          </p>
          <p
            className="mt-1 text-xs text-muted-foreground"
            title={formatDate(event.createdAt)}
          >
            Created {timeAgo(event.createdAt)} · ID {event.id}
          </p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-base font-semibold text-foreground">
        Payload
      </h2>
      {/* event.payload comes from Prisma as a JS Object, JsonBlock will stringify it */}
      <JsonBlock value={event.payload} maxHeight="20rem" />

      <h2 className="mb-3 mt-8 font-display text-base font-semibold text-foreground">
        Deliveries ({deliveries.length})
      </h2>
      {deliveries.length === 0 ? (
        <EmptyState
          icon={<FiBox />}
          title="No deliveries for this event"
          description="No active destination was subscribed when this event arrived."
        />
      ) : (
        <TableWrapper>
          <THead>
            <TR>
              <TH>Destination</TH>
              <TH>Status</TH>
              <TH>Attempts</TH>
              <TH>Last error</TH>
              <TH className="text-right">Updated</TH>
            </TR>
          </THead>
          <tbody>
            {deliveries.map((row) => (
              <TR key={row.id}>
                <TD className="max-w-60 truncate text-xs">
                  {row.destinationUrl}
                </TD>
                <TD>
                  <DeliveryStatusBadge status={row.status} />
                </TD>
                <TD className="text-xs">
                  {row.attemptCount}/{row.maxAttempts}
                </TD>
                <TD className="max-w-50 truncate font-mono text-xs text-muted-foreground">
                  {row.lastError ?? "—"}
                </TD>
                <TD className="text-right text-xs text-muted-foreground">
                  {timeAgo(row.updatedAt)}
                </TD>
              </TR>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </div>
  );
}

export default EventDetailPage;
