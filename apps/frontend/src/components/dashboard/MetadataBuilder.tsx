import { FiPlus, FiTrash2 } from "react-icons/fi";
import { Button } from "../ui/Button";
import type { MetadataRow } from "../../lib/metadata";

interface MetadataBuilderProps {
  rows: MetadataRow[];
  onChange: (rows: MetadataRow[]) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Controlled key-value editor for organization metadata.
 * Parent owns the rows state and validation on submit.
 */
export function MetadataBuilder({
  rows,
  onChange,
  error,
  disabled = false,
}: MetadataBuilderProps) {
  return (
    <fieldset className="rounded-2xl border border-border p-4">
      <legend className="px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Custom fields{" "}
        <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
          (metadata · optional)
        </span>
      </legend>

      {rows.length > 0 ? (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-2">
              <input
                type="text"
                placeholder="Name (e.g. team)"
                aria-label="Field name"
                value={row.key}
                onChange={(event) =>
                  onChange(
                    rows.map((r) =>
                      r.id === row.id ? { ...r, key: event.target.value } : r,
                    ),
                  )
                }
                disabled={disabled}
                className="h-11 w-full min-w-0 rounded-xl border border-border bg-input px-3.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:max-w-[38%]"
              />
              <input
                type="text"
                placeholder="Value (e.g. platform)"
                aria-label="Field value"
                value={row.value}
                onChange={(event) =>
                  onChange(
                    rows.map((r) =>
                      r.id === row.id ? { ...r, value: event.target.value } : r,
                    ),
                  )
                }
                disabled={disabled}
                className="h-11 w-full min-w-0 rounded-xl border border-border bg-input px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                aria-label={`Remove field ${row.key || ""}`}
                disabled={disabled}
                className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <FiTrash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1 text-xs leading-relaxed text-muted-foreground">
          Attach arbitrary key-value data to this organization — labels,
          internal ids, billing codes…
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2.5 text-xs text-red-500">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => onChange([...rows, { id: `md_${Date.now()}`, key: "", value: "" }])}
        disabled={disabled}
      >
        <FiPlus aria-hidden="true" /> Add custom field
      </Button>
    </fieldset>
  );
}
