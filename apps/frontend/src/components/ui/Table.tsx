import type { ReactNode } from "react";
import type { ThHTMLAttributes, TdHTMLAttributes } from "react";

export function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-muted/50">{children}</thead>
  );
}

export function TR({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-border/60 last:border-0 ${
        onClick ? "cursor-pointer transition-colors hover:bg-muted/40" : ""
      }`}
    >
      {children}
    </tr>
  );
}

export function TH({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-4 py-3.5 align-middle text-foreground ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
