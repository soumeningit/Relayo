import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { Card, EmptyState, Spinner } from "../../components/ui";
import { AdminDeliveryStatusBadge } from "../../components/admin/badges";
import type { AdminDelivery } from "../../types/admin";
import { formatLatency, timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as opsService from "../../api/services/adminOpsService";

function AdminDeliveryDetailPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();

  useDocumentMeta({
    title: deliveryId ? `Delivery ${deliveryId}` : "Delivery",
    description: "Delivery attempt details.",
  });

  const [delivery, setDelivery] = useState<AdminDelivery | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!deliveryId) return;
    let cancelled = false;

    opsService
      .getAdminDelivery(deliveryId)
      .then((result) => {
        if (!cancelled) setDelivery(result);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [deliveryId]);

  if (notFound) {
    return (
      <EmptyState
        icon={<FiArrowLeft />}
        title="Delivery not found"
        description="It may have been removed or never existed."
        action={
          <Link
            to="/admin/dashboard/deliveries"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-500"
          >
            Back to deliveries
          </Link>
        }
      />
    );
  }

  if (!delivery) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const info = [
    { label: "Organization", value: delivery.organizationName },
    { label: "Event", value: delivery.eventType, mono: true },
    { label: "Event ID", value: delivery.eventId, mono: true },
    { label: "Destination", value: delivery.destinationHost, mono: true },
    { label: "Destination ID", value: delivery.destinationId, mono: true },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/dashboard/deliveries"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <FiArrowLeft aria-hidden="true" /> Deliveries
          </Link>
          <h1 className="mt-1.5 flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <span className="font-mono">{delivery.id}</span>
            <AdminDeliveryStatusBadge status={delivery.status} />
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Created {timeAgo(delivery.createdAt)} · updated{" "}
          {timeAgo(delivery.updatedAt)}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Delivery</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {info.map((item) => (
              <div key={item.label}>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </dt>
                <dd
                  className={`mt-0.5 truncate text-sm text-foreground ${
                    item.mono ? "font-mono text-xs" : "font-medium"
                  }`}
                >
                  {item.value}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Last response
              </dt>
              <dd
                className={`mt-0.5 font-mono text-sm ${
                  delivery.lastResponseCode && delivery.lastResponseCode >= 400
                    ? "text-red-500"
                    : "text-emerald-600 dark:text-emerald-300"
                }`}
              >
                {delivery.lastResponseCode ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Latency
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-foreground">
                {formatLatency(delivery.latencyMs)}
              </dd>
            </div>
          </dl>
          {delivery.lastError && (
            <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">
              {delivery.lastError}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Attempts</h2>
          <ol className="mt-3 space-y-4">
            {delivery.attempts.map((attempt) => {
              const ok = attempt.responseCode != null && attempt.responseCode < 400;
              return (
                <li key={attempt.attemptNumber} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                        ok
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
                          : "bg-red-500/12 text-red-600 dark:text-red-300"
                      }`}
                    >
                      {attempt.attemptNumber}
                    </span>
                    {attempt.attemptNumber < delivery.attempts.length && (
                      <span className="mt-1 h-full w-px bg-border" />
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono font-medium text-foreground">
                        {attempt.responseCode ?? "—"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatLatency(attempt.latencyMs)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(attempt.attemptedAt)}
                      </span>
                    </p>
                    {attempt.error && (
                      <p className="mt-0.5 text-xs text-red-500">{attempt.error}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}

export default AdminDeliveryDetailPage;