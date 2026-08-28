import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { toast } from "sonner";
import { DropdownMenu, MenuItem } from "../ui/DropdownMenu";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { setTenant } = useTenant();

  const handleLogout = () => {
    logout();
    setTenant(null);
    toast.info("You have been signed out.");
    navigate("/", { replace: true });
  };

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu
      trigger={
        <button
          aria-label="Open user menu"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-transform hover:scale-105"
        >
          {initial}
        </button>
      }
    >
      {(close) => (
        <>
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-xs text-muted-foreground" title={user?.email}>
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
