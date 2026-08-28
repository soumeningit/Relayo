import { Fragment, useState, type ReactNode } from "react";
import { FiChevronDown as ChevronDown } from "react-icons/fi";
import { DeliveryStatusBadge, TD, TH, THead, TR, TableWrapper } from "../ui";
import type { DeliveryRow } from "../../types/dashboard";
import { formatLatency, timeAgo } from "../../lib/time";

interface DeliveryTableProps {
  rows: DeliveryRow[];
  showDestination?: boolean;
  renderAction?: (row: DeliveryRow) => ReactNode;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function DeliveryTable({
  rows,
  showDestination = true,
  renderAction,
}: DeliveryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rows.length === 0) {
    return null;
  }

  return (
    <TableWrapper>
      <THead>
        <TR>
          <TH className="w-8" aria-label="Expand" />
          <TH>Event</TH>
          {showDestination && <TH>Destination</TH>}
          <TH>Status</TH>
          <TH>Attempts</TH>
          <TH>Last code</TH>
          <TH className="text-right">Updated</TH>
          {renderAction && <TH aria-label="Actions" />}
        </TR>
      </THead>
      <tbody>
        {rows.map((row) => {
          const expanded = expandedId === row.id;
          return (
            <Fragment key={row.id}>
              <TR>
                <TD>
                  <button
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    aria-expanded={expanded}
                    aria-label={
                      expanded ? "Collapse attempts" : "Show attempts"
                    }
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronDown
                      className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                      size={15}
                    />
                  </button>
                </TD>
                <TD>
                  <span className="font-mono text-xs font-medium">
                    {row.eventType}
                  </span>
                </TD>
                {showDestination && (
                  <TD
                    className="max-w-50 truncate text-xs text-muted-foreground"
                    title={row.destinationUrl}
                  >
                    {hostOf(row.destinationUrl)}
                  </TD>
                )}
                <TD>
                  <DeliveryStatusBadge status={row.status} />
                </TD>
                <TD className="text-xs">
                  {row.attemptCount}/{row.maxAttempts}
                  {row.nextRetryAt && row.status === "failed" && (
                    <span
                      className="ml-1.5 text-amber-500 dark:text-amber-300"
                      title={`Next retry ${timeAgo(row.nextRetryAt) === "just now" ? "soon" : timeAgo(row.nextRetryAt)}`}
                    >
                      · retrying
                    </span>
                  )}
                </TD>
                <TD className="font-mono text-xs">
                  {row.lastResponseCode ?? "—"}
                </TD>
                <TD className="text-right text-xs text-muted-foreground">
                  {timeAgo(row.updatedAt)}
                </TD>
                {renderAction && (
                  <TD className="text-right">{renderAction(row)}</TD>
                )}
              </TR>

              {expanded && (
                <tr className="bg-muted/30">
                  <td
                    colSpan={
                      showDestination && renderAction
                        ? 8
                        : showDestination || renderAction
                          ? 7
                          : 6
                    }
                    className="px-4 py-4"
                  >
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Attempt history
                    </p>
                    {row.attempts.length === 0 ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        No attempts recorded yet — queued for first delivery.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {[...row.attempts].reverse().map((attempt) => (
                          <li
                            key={attempt.attemptNumber}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs"
                          >
                            <span className="font-semibold">
                              #{attempt.attemptNumber}
                            </span>
                            <span
                              className={
                                attempt.responseCode &&
                                attempt.responseCode >= 200 &&
                                attempt.responseCode < 300
                                  ? "text-emerald-500 dark:text-emerald-300"
                                  : "text-red-500 dark:text-red-300"
                              }
                            >
                              {attempt.responseCode ?? "ERR"}
                            </span>
                            <span className="text-muted-foreground">
                              {formatLatency(attempt.latencyMs)}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate text-muted-foreground"
                              title={attempt.error ?? undefined}
                            >
                              {attempt.error ?? "OK"}
                            </span>
                            <span className="text-muted-foreground">
                              {timeAgo(attempt.attemptedAt)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </TableWrapper>
  );
}
