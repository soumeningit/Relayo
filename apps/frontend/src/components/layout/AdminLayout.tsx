import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FiLogOut, FiMenu } from "react-icons/fi";
import { toast } from "sonner";
import { AdminSidebar } from "./AdminSidebar";
import { ThemeToggle } from "../theme/ThemeToggle";
import { DropdownMenu, MenuItem } from "../ui/DropdownMenu";
import { useAdmin } from "../../contexts/AdminContext";

function AdminUserMenu() {
  const { user, logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("Signed out of the admin console.");
    navigate("/admin", { replace: true });
  };

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu
      trigger={
        <button
          aria-label="Open admin account menu"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-transform hover:scale-105"
        >
          {initial}
        </button>
      }
    >
      {(close) => (
        <>
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-xs font-medium text-foreground">
              {user?.name ?? "Administrator"}
            </p>
            <p
              className="truncate text-xs text-muted-foreground"
              title={user?.email}
            >
              {user?.email}
            </p>
          </div>
          <MenuItem
            icon={<FiLogOut size={15} />}
            danger
            onClick={() => {
              close();
              handleLogout();
            }}
          >
            Sign out
          </MenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

export function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
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
                aria-label="Open admin navigation menu"
              >
                <FiMenu size={20} />
              </button>
              <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Admin console
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <AdminUserMenu />
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