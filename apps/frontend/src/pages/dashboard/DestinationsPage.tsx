import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiChevronRight,
  FiMapPin,
  FiPlus,
} from "react-icons/fi";
import {
  Button,
  EmptyState,
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
import type { Destination } from "../../types/dashboard";
import { circuitStateOf } from "../../types/dashboard";
import { timeAgo } from "../../lib/time";
import AddDestinationModal from "../../components/destinations/AddDestinationModal";
import { CircuitStateBadge, DestinationStatusBadge } from "../../components/ui/StatusBadge";

function DestinationsPage() {
  useDocumentMeta({
    title: "Destinations",
    description: "Manage the endpoints your webhook events are delivered to.",
  });

  const { tenant } = useTenant();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const { run } = useApiCall();

  const load = () =>
    tenant
      ? destinationService.listDestinations(tenant.id)
      : Promise.resolve([]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    destinationService
      .listDestinations(tenant.id)
      .then((data) => {
        if (!cancelled) setDestinations(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Destinations
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Endpoints that receive your events, with health and breaker state.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <FiPlus aria-hidden="true" /> Add destination
        </Button>
      </div>

      {destinations.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<FiMapPin />}
            title="No destinations registered"
            description="Add your first customer endpoint — Relayo will health-track it from day one."
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <FiPlus aria-hidden="true" /> Add destination
              </Button>
            }
          />
        </div>
      ) : (
        <TableWrapper>
          <THead>
            <TR>
              <TH>URL</TH>
              <TH>Status</TH>
              <TH>Circuit</TH>
              <TH>Failures</TH>
              <TH>Created</TH>
              <TH aria-label="Actions" />
            </TR>
          </THead>
          <tbody>
            {destinations.map((dest) => (
              <TR key={dest.id}>
                <TD>
                  <Link
                    to={`/dashboard/destinations/${dest.id}`}
                    className="block max-w-70 truncate font-medium text-indigo-500 hover:underline dark:text-indigo-300"
                  >
                    {dest.url}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {dest.name}
                  </span>
                </TD>
                <TD>
                  <DestinationStatusBadge status={dest.status} />
                </TD>
                <TD>
                  <CircuitStateBadge
                    state={circuitStateOf(dest.consecutiveFailures)}
                  />
                </TD>
                <TD>
                  {dest.consecutiveFailures > 0 ? (
                    <span className="font-medium text-red-500">
                      {dest.consecutiveFailures}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TD>
                <TD className="text-xs text-muted-foreground">
                  {timeAgo(dest.createdAt)}
                </TD>
                <TD className="text-right">
                  <Link
                    to={`/dashboard/destinations/${dest.id}`}
                    aria-label={`Open ${dest.url}`}
                    className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <FiChevronRight />
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </TableWrapper>
      )}

      <AddDestinationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() =>
          run(load, { successMessage: "Destination created" })
        }
      />
    </div>
  );
}

export default DestinationsPage;
