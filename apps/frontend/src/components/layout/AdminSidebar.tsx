import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  FiActivity,
  FiBriefcase,
  FiChevronsLeft,
  FiChevronsRight,
  FiCreditCard,
  FiExternalLink,
  FiHome,
  FiLayers,
  FiSettings,
  FiShield,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";

const items = [
  { to: "/admin/dashboard", label: "Overview", icon: FiHome, end: true },
  { to: "/admin/dashboard/organizations", label: "Organizations", icon: FiBriefcase },
  { to: "/admin/dashboard/users", label: "Users", icon: FiUsers },
  { to: "/admin/dashboard/billing", label: "Billing", icon: FiCreditCard },
  { to: "/admin/dashboard/usage", label: "Usage", icon: FiActivity },
  { to: "/admin/dashboard/settings", label: "Settings", icon: FiSettings },
];

const platformItems = [
  { to: "/admin/dashboard/health", label: "Platform health", icon: FiActivity },
  { to: "/admin/dashboard/deliveries", label: "Deliveries", icon: FiLayers },
  { to: "/admin/dashboard/events", label: "Events", icon: FiZap },
];

function AdminBrandMark({ showWordmark }: { showWordmark?: boolean }) {
  return (
    <div className="flex h-16 shrink-0 items-center px-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-indigo-500 via-violet-500 to-cyan-400 shadow-md shadow-indigo-500/25">
        <FiShield className="h-4.5 w-4.5 text-white" aria-hidden="true" />
      </span>
      <span
        className={`ml-2.5 truncate font-display text-lg font-bold text-foreground ${
          showWordmark === false ? "lg:hidden" : ""
        }`}
      >
        Relayo<span className="text-indigo-500"> Admin</span>
      </span>
    </div>
  );
}

function NavList({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="Admin"
      className="flex flex-1 flex-col gap-1 overflow-y-auto px-3"
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={label}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${expanded ? "" : "lg:justify-center lg:px-0"}`
          }
        >
          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
          <span className={`truncate ${expanded ? "" : "lg:hidden"}`}>
            {label}
          </span>
        </NavLink>
      ))}

      {expanded && (
        <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Platform
        </p>
      )}

      {platformItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={label}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${expanded ? "" : "lg:justify-center lg:px-0"}`
          }
        >
          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
          <span className={`truncate ${expanded ? "" : "lg:hidden"}`}>
            {label}
          </span>
        </NavLink>
      ))}

      <div className="my-2 border-t border-border/70" />
      <Link
        to="/"
        onClick={onNavigate}
        title="Back to the Relayo app"
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
          expanded ? "" : "lg:justify-center lg:px-0"
        }`}
      >
        <FiExternalLink className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
        <span className={`truncate ${expanded ? "" : "lg:hidden"}`}>
          Back to app
        </span>
      </Link>
    </nav>
  );
}

export function AdminSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [pinned, setPinned] = useState(false);

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/50 transition-all duration-300 lg:flex ${
          pinned ? "lg:w-60" : "lg:w-18"
        }`}
      >
        <AdminBrandMark showWordmark={pinned} />
        <NavList expanded={pinned} />

        <button
          onClick={() => setPinned((p) => !p)}
          aria-label={pinned ? "Collapse sidebar" : "Expand sidebar"}
          className={`mx-3 mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
            pinned ? "" : "lg:justify-center lg:px-0"
          }`}
        >
          {pinned ? (
            <FiChevronsLeft
              className="h-4.5 w-4.5 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <FiChevronsRight
              className="h-4.5 w-4.5 shrink-0"
              aria-hidden="true"
            />
          )}
          <span className={`truncate ${pinned ? "" : "lg:hidden"}`}>
            Collapse
          </span>
        </button>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-90 bg-black/55 backdrop-blur-sm lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onMobileClose();
          }}
        >
          <aside className="flex h-full w-72 flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between pr-4">
              <AdminBrandMark />
              <button
                onClick={onMobileClose}
                aria-label="Close navigation"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <FiX size={18} />
              </button>
            </div>
            <NavList expanded onNavigate={onMobileClose} />
            <div className="pb-4" />
          </aside>
        </div>
      )}
    </>
  );
}