import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { FiArrowRight, FiMenu } from "react-icons/fi";
import { SidebarRail } from "./SidebarRail";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "../theme/ThemeToggle";
import { useTenant } from "../../contexts/TenantContext";

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { tenant } = useTenant();

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarRail
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 border-b border-border">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="grid h-10 w-10 place-items-center rounded-xl border border-border text-foreground lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <FiMenu size={20} />
              </button>
              {tenant && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-indigo-500/15 text-[10px] font-bold uppercase text-indigo-500 dark:text-indigo-300">
                    {tenant.name.charAt(0)}
                  </span>
                  <span className="max-w-35 truncate text-xs font-medium text-muted-foreground sm:max-w-none">
                    {tenant.name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
              >
                Go Home <FiArrowRight aria-hidden="true" />
              </Link>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
