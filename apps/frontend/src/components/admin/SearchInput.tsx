import { FiSearch } from "react-icons/fi";

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <FiSearch
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-56 rounded-xl border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />
    </label>
  );
}