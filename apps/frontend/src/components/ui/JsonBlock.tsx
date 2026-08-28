import { CopyButton } from "./CopyButton";

interface JsonBlockProps {
  value: unknown;
  maxHeight?: string;
}

export function JsonBlock({ value, maxHeight = "22rem" }: JsonBlockProps) {
  const serialized = JSON.stringify(value, null, 2);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-input">
      <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <CopyButton value={serialized} label="Payload" />
      </div>
      <pre
        className="overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground"
        style={{ maxHeight }}
      >
        {serialized}
      </pre>
    </div>
  );
}
