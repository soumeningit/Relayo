import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
}

export function DropdownMenu({
  trigger,
  children,
  align = "right",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </div>
      {open && (
        <div
          className={`absolute z-50 mt-2 min-w-[190px] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          {typeof children === "function"
            ? children(() => setOpen(false))
            : children}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function MenuItem({
  onClick,
  icon,
  danger,
  disabled,
  children,
}: MenuItemProps) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        danger
          ? "text-red-500 hover:bg-red-500/10"
          : "text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
