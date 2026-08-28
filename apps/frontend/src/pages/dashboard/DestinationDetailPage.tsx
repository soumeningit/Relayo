import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiKey,
  FiPauseCircle,
  FiPlayCircle,
} from "react-icons/fi";
import {
  Button,
  ConfirmDialog,
  CopyButton,
  DeliveryStatusBadge,
  EmptyState,
  Modal,
  PageLoader,
  StatCard,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import * as destinationService from "../../api/services/DestinationService";
import { useTenant } from "../../contexts/TenantContext";
import type {
  DeliveryRow,
  Destination,
  DestinationDelivery,
} from "../../types/dashboard";
import { circuitStateOf } from "../../types/dashboard";
import { CircuitStateBadge } from "../../components/ui/StatusBadge";
import { formatLatency, timeAgo } from "../../lib/time";
import { toast } from "sonner";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

// Maps DB enum status to the UI expected string status
function mapDeliveryStatus(dbStatus: string): DeliveryRow["status"] {
  switch (dbStatus) {
    case "SUCCESS":
      return "delivered";
    case "FAILED":
      return "dead_letter";
    case "PAUSED":
      return "paused";
    default:
      return "pending";
  }
}

function DestinationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const { isLoading, run } = useApiCall();

  useDocumentMeta({
    title: destination ? hostOf(destination.url) : "Destination",
    description: "Destination health and delivery history.",
  });

  useEffect(() => {
    if (!id || !tenant) return;
    let cancelled = false;

    destinationService
      .getDestinationDetails(tenant.id, id)
      .then((data) => {
        if (!cancelled) {
          if (!data) {
            setNotFound(true);
            return;
          }

          setDestination(data);

          // Map Prisma delivery data to UI DeliveryRow type
          const mappedDeliveries: DeliveryRow[] = (data.deliveries ?? []).map(
            (d: DestinationDelivery) => ({
              id: d.id,
              eventId: d.event.eventId, // From the included relation
              destinationId: data.id,
              eventType: d.event.eventType,
              status: mapDeliveryStatus(d.status),
              attemptCount: d.attempts,
              maxAttempts: 5, // Matches your worker MAX_RETRIES_PER_JOB constant
              nextRetryAt: null,
              lastResponseCode: d.lastResponseStatusCode,
              lastError: d.lastErrorMessage,
              updatedAt: d.updatedAt,
              attempts: [],
              destinationUrl: data.url,
            }),
          );

          setDeliveries(mappedDeliveries);
        }
      })
      .catch((e) => {
        console.error("Error fetching destination details:", e.response);
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id, tenant]);

  if (notFound) {
    return (
      <EmptyState
        title="Destination not found"
        description="It may have been deleted."
        action={
          <Link to="/dashboard/destinations">
            <Button variant="outline" size="sm">
              <FiArrowLeft aria-hidden="true" /> Back to destinations
            </Button>
          </Link>
        }
      />
    );
  }

  if (!destination) return <PageLoader />;

  const terminal = deliveries.filter(
    (d) => d.status === "delivered" || d.status === "dead_letter",
  );
  const delivered = deliveries.filter((d) => d.status === "delivered");
  const successRatePct = terminal.length
    ? Math.round((delivered.length / terminal.length) * 100)
    : 100;
  const avgLatency = delivered.length
    ? Math.round(
        delivered.reduce(
          (sum, d) => sum + (d.attempts.at(-1)?.latencyMs ?? 0),
          0,
        ) / delivered.length,
      )
    : null;

  const togglePause = async () => {
    if (!tenant) return;
    const updated = await run(() =>
      destination.status === "active"
        ? destinationService.pauseDestination(tenant.id, destination.id)
        : destinationService.resumeDestination(tenant.id, destination.id),
    );
    if (!updated) return;
    setDestination(updated);
    toast.success(
      updated.status === "paused"
        ? "Destination paused — delivery is suspended"
        : "Destination resumed — probing for recovery",
    );
  };

  const handleRotate = async () => {
    if (!tenant) return;
    const result = await run(
      () =>
        destinationService.rotateDestinationSecret(tenant.id, destination.id),
      { showErrorToast: false },
    );
    if (!result) return;
    setRotateOpen(false);
    setNewSecret(result.secret);
    toast.success("Signing secret rotated");
  };

  return (
    <div>
      <Link
        to="/dashboard/destinations"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <FiArrowLeft aria-hidden="true" /> All destinations
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {hostOf(destination.url)}
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {destination.url}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Created {timeAgo(destination.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotateOpen(true)}
          >
            <FiKey aria-hidden="true" /> Rotate secret
          </Button>
          <Button size="sm" onClick={togglePause} isLoading={isLoading}>
            {destination.status === "active" ? (
              <>
                <FiPauseCircle aria-hidden="true" /> Pause
              </>
            ) : (
              <>
                <FiPlayCircle aria-hidden="true" /> Resume
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Success rate"
          value={`${successRatePct}%`}
          tone={
            successRatePct >= 95
              ? "success"
              : successRatePct >= 80
                ? "warning"
                : "danger"
          }
        />
        <StatCard label="Avg latency" value={formatLatency(avgLatency)} />
        <StatCard
          label="Consecutive failures"
          value={destination.consecutiveFailures}
          tone={destination.consecutiveFailures > 0 ? "danger" : "default"}
        />
      </div>

      <div className="mt-4">
        <span className="text-xs text-muted-foreground">Circuit: </span>
        <CircuitStateBadge
          state={circuitStateOf(destination.consecutiveFailures)}
        />
      </div>

      <h2 className="mb-3 mt-8 font-display text-base font-semibold text-foreground">
        Recent deliveries to this endpoint
      </h2>
      {deliveries.length === 0 ? (
        <EmptyState
          title="No deliveries yet"
          description="Events will appear here as soon as they match this destination."
        />
      ) : (
        <TableWrapper>
          <THead>
            <TR>
              <TH>Event</TH>
              <TH>Status</TH>
              <TH>Attempts</TH>
              <TH>Last code</TH>
              <TH className="text-right">Updated</TH>
            </TR>
          </THead>
          <tbody>
            {deliveries.map((row) => (
              <TR key={row.id}>
                <TD>
                  <Link
                    to={`/dashboard/events/${row.eventId}`}
                    className="font-mono text-xs text-indigo-500 hover:underline dark:text-indigo-300"
                  >
                    {row.eventType}
                  </Link>
                </TD>
                <TD>
                  <DeliveryStatusBadge status={row.status} />
                </TD>
                <TD className="text-xs">
                  {row.attemptCount}/{row.maxAttempts}
                </TD>
                <TD className="font-mono text-xs">
                  {row.lastResponseCode ?? "—"}
                </TD>
                <TD className="text-right text-xs text-muted-foreground">
                  {timeAgo(row.updatedAt)}
                </TD>
              </TR>
            ))}
          </tbody>
        </TableWrapper>
      )}

      <ConfirmDialog
        open={rotateOpen}
        onClose={() => setRotateOpen(false)}
        onConfirm={handleRotate}
        isLoading={isLoading}
        destructive={false}
        title="Rotate signing secret?"
        confirmLabel="Rotate now"
        message="A new HMAC secret will be generated and shown once. The old secret stops working immediately — update your endpoint before rotating."
      />

      <Modal
        open={!!newSecret}
        onClose={() => setNewSecret(null)}
        title="Your new signing secret"
        size="md"
      >
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3.5 text-xs leading-relaxed text-muted-foreground">
          ⚠ Shown once. Update your endpoint config with this value to keep
          signature verification working.
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-input p-3.5">
          <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
            {newSecret}
          </code>
          <CopyButton value={newSecret ?? ""} label="Secret" />
        </div>
        <Button fullWidth className="mt-5" onClick={() => setNewSecret(null)}>
          I've stored it safely
        </Button>
      </Modal>
    </div>
  );
}

export default DestinationDetailPage;
