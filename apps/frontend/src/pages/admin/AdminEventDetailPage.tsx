import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiLayers, FiZap } from "react-icons/fi";
import { Card, EmptyState, JsonBlock, Spinner, TD, TH, THead, TR, TableWrapper } from "../../components/ui";
import { AdminDeliveryStatusBadge } from "../../components/admin/badges";
import type { AdminDelivery, AdminEvent } from "../../types/admin";
import { formatLatency, timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as opsService from "../../api/services/adminApi";

function AdminEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  useDocumentMeta({
    title: eventId ? `Event ${eventId}` : "Event",
    description: "Event and its deliveries.",
  });

  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [deliveries, setDeliveries] = useState<AdminDelivery[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    opsService
      .getAdminEvent(eventId)
      .then((result) => {
        if (!cancelled) setEvent(result);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    opsService
      .listAdminDeliveries({ eventId })
      .then((result) => {
        if (!cancelled) setDeliveries(result.items);
      })
      .catch(() => {
        /* deliveries are optional context */
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (notFound) {
    return (
      <EmptyState
        icon={<FiZap />}
        title="Event not found"
        description="It may have been pruned or never existed."
        action={
          <Link
            to="/admin/dashboard/events"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-500"
          >
            Back to events
          </Link>
        }
      />
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/dashboard/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <FiArrowLeft aria-hidden="true" /> Events
          </Link>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <span className="font-mono">{event.eventType}</span>
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {event.id} · {event.organizationName} · {timeAgo(event.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Payload</h2>
          <div className="mt-3">
            <JsonBlock value={event.payload} maxHeight="20rem" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-sm font-semibold text-foreground">
              Deliveries
            </h2>
            <span className="text-xs text-muted-foreground">
              {event.deliveryCount} delivery
              {event.deliveryCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3">
            {deliveries === null ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6 text-indigo-500" />
              </div>
            ) : deliveries.length === 0 ? (
              <EmptyState
                icon={<FiLayers />}
                title="No deliveries"
                description="This event has not been delivered yet."
              />
            ) : (
              <TableWrapper>
                <THead>
                  <TR>
                    <TH>Delivery</TH>
                    <TH>Destination</TH>
                    <TH>Status</TH>
                    <TH>Latency</TH>
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
                      <TD className="max-w-36 truncate font-mono text-xs">
                        {delivery.id}
                      </TD>
                      <TD className="max-w-40 truncate text-xs text-muted-foreground">
                        {delivery.destinationHost}
                      </TD>
                      <TD>
                        <AdminDeliveryStatusBadge status={delivery.status} />
                      </TD>
                      <TD className="font-mono text-xs text-muted-foreground">
                        {formatLatency(delivery.latencyMs)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </TableWrapper>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AdminEventDetailPage;