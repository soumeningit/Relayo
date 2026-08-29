import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiKey,
  FiMoreHorizontal,
  FiPauseCircle,
  FiPlayCircle,
  FiShield,
  FiShieldOff,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  Spinner,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { DropdownMenu, MenuItem } from "../../components/ui/DropdownMenu";
import { AdminSearchInput } from "../../components/admin/SearchInput";
import { UserStatusBadge } from "../../components/admin/badges";
import type { AdminUser, AdminUserStatus } from "../../types/admin";
import { formatDate } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as adminService from "../../api/services/adminMockService";

const mfaPill =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium";

function AdminUsersPage() {
  useDocumentMeta({
    title: "Users",
    description: "Every account registered on the Relayo platform.",
  });

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mfaConfirmId, setMfaConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminService
      .listAdminUsers(search)
      .then((result) => {
        if (cancelled) return;
        setUsers(result);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [search]);

  const patchUser = (updated: AdminUser) => {
    setUsers((prev) =>
      prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : prev,
    );
  };

  const handleStatus = async (user: AdminUser, status: AdminUserStatus) => {
    setBusyId(user.id);
    try {
      const updated = await adminService.updateUserStatus(user.id, status);
      patchUser(updated);
      toast.success(
        status === "suspended"
          ? `${user.name} was suspended.`
          : status === "verified"
            ? `${user.name} is now verified.`
            : `${user.name} was marked unverified.`,
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Could not update the user status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      await adminService.resetUserPassword(user.id);
      toast.success(`A password reset email was sent to ${user.email}.`);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Could not reset the password.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDisableMfa = async () => {
    if (!mfaConfirmId) return;
    const user = users?.find((item) => item.id === mfaConfirmId);
    setBusyId(mfaConfirmId);
    try {
      const updated = await adminService.disableUserMfa(mfaConfirmId);
      patchUser(updated);
      toast.success(`MFA was disabled for ${user?.email ?? "the account"}.`);
      setMfaConfirmId(null);
    } catch (error) {
      console.error("Error disabling MFA:", error);
      toast.error("Could not disable MFA.");
    } finally {
      setBusyId(null);
    }
  };

  const mfaTarget = users?.find((item) => item.id === mfaConfirmId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Users
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Accounts, verification and MFA state across the platform.
          </p>
        </div>
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or email…"
          className="w-full sm:w-64"
        />
      </div>

      <div className="mt-6">
        {users === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<FiUsers />}
            title="No users found"
            description={
              search
                ? `Nothing matches “${search}”. Try a different query.`
                : "Accounts appear here once they register."
            }
          />
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>User</TH>
                <TH>Status</TH>
                <TH>MFA</TH>
                <TH>Organizations</TH>
                <TH>Joined</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {users.map((user) => (
                <TR key={user.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <UserStatusBadge status={user.status} />
                  </TD>
                  <TD>
                    {user.mfaEnabled ? (
                      <span
                        className={`${mfaPill} border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`}
                      >
                        <FiShield size={11} aria-hidden="true" /> MFA on
                      </span>
                    ) : (
                      <span
                        className={`${mfaPill} border border-border bg-muted text-muted-foreground`}
                      >
                        <FiShieldOff size={11} aria-hidden="true" /> Off
                      </span>
                    )}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {user.organizationCount}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {formatDate(user.joinedAt)}
                  </TD>
                  <TD className="text-right">
                    <DropdownMenu
                      trigger={
                        <button
                          aria-label={`Manage ${user.name}`}
                          disabled={busyId === user.id}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          <FiMoreHorizontal aria-hidden="true" />
                        </button>
                      }
                    >
                      {(close) => (
                        <>
                          {user.status !== "verified" && (
                            <MenuItem
                              disabled={busyId === user.id}
                              icon={<FiCheckCircle size={15} />}
                              onClick={() => {
                                close();
                                handleStatus(user, "verified");
                              }}
                            >
                              Verify
                            </MenuItem>
                          )}
                          {user.status !== "unverified" && (
                            <MenuItem
                              icon={<FiXCircle size={15} />}
                              onClick={() => {
                                close();
                                handleStatus(user, "unverified");
                              }}
                            >
                              Mark unverified
                            </MenuItem>
                          )}
                          {user.status !== "suspended" ? (
                            <MenuItem
                              disabled={busyId === user.id}
                              danger
                              icon={<FiPauseCircle size={15} />}
                              onClick={() => {
                                close();
                                handleStatus(user, "suspended");
                              }}
                            >
                              Suspend
                            </MenuItem>
                          ) : (
                            <MenuItem
                              disabled={busyId === user.id}
                              icon={<FiPlayCircle size={15} />}
                              onClick={() => {
                                close();
                                handleStatus(user, "verified");
                              }}
                            >
                              Reactivate
                            </MenuItem>
                          )}
                          <MenuItem
                            disabled={busyId === user.id}
                            icon={<FiKey size={15} />}
                            onClick={() => {
                              close();
                              handleResetPassword(user);
                            }}
                          >
                            Reset password
                          </MenuItem>
                          {user.mfaEnabled && (
                            <MenuItem
                              disabled={busyId === user.id}
                              danger
                              icon={<FiShieldOff size={15} />}
                              onClick={() => {
                                close();
                                setMfaConfirmId(user.id);
                              }}
                            >
                              Disable MFA
                            </MenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </div>

      <ConfirmDialog
        open={mfaConfirmId !== null}
        onClose={() => {
          if (busyId === null) setMfaConfirmId(null);
        }}
        onConfirm={handleDisableMfa}
        title="Disable MFA"
        message={`Disable multi-factor authentication for ${mfaTarget?.email ?? "this user"}? They will be asked to re-enable it at their next sign-in.`}
        confirmLabel="Disable MFA"
        isLoading={busyId !== null}
      />
    </div>
  );
}

export default AdminUsersPage;