import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  FiAlertTriangle,
  FiDownload,
  FiFileText,
  FiKey,
  FiLock,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Spinner } from "../../components/ui/Spinner";
import { TD, TH, THead, TR, TableWrapper } from "../../components/ui";
import { AdminSearchInput } from "../../components/admin/SearchInput";
import { useAdmin } from "../../contexts/AdminContext";
import { validateName, validatePassword } from "../../lib/validation";
import { formatDate, timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as adminService from "../../api/services/adminMockService";
import * as opsService from "../../api/services/adminOpsService";
import type {
  AdminAuditCategory,
  AdminAuditEntry,
  AdminFeatureFlag,
  AdminProfile,
} from "../../types/admin";

const selectClasses =
  "h-10 rounded-xl border border-border bg-input px-3.5 text-sm text-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const categoryOptions: { value: AdminAuditCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "auth", label: "Auth" },
  { value: "security", label: "Security" },
  { value: "organization", label: "Organization" },
  { value: "user", label: "User" },
  { value: "billing", label: "Billing" },
  { value: "system", label: "System" },
];

function AdminSettingsPage() {
  useDocumentMeta({
    title: "Admin settings",
    description: "Admin account, feature flags, exports and the audit log.",
  });

  const { updateUser } = useAdmin();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const [flags, setFlags] = useState<AdminFeatureFlag[] | null>(null);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"organizations" | "users" | "payments" | null>(null);

  const [audit, setAudit] = useState<AdminAuditEntry[] | null>(null);
  const [auditCategory, setAuditCategory] = useState<AdminAuditCategory | "all">("all");
  const [auditActor, setAuditActor] = useState<string>("all");
  const [auditQuery, setAuditQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    adminService.getAdminProfile().then((result) => {
      if (cancelled) return;
      setProfile(result);
      setName(result.name);
    });

    opsService.getFeatureFlags().then((result) => {
      if (!cancelled) setFlags(result);
    });

    opsService.listAuditEntries().then((result) => {
      if (!cancelled) setAudit(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    setNameError(undefined);
  };

  const handleSaveName = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateName(name);
    if (error) {
      setNameError(error);
      return;
    }

    setSavingName(true);
    try {
      const updated = await adminService.updateAdminProfile(name);
      setProfile(updated);
      updateUser({ name: updated.name });
      toast.success("Admin profile updated.");
    } catch (err) {
      console.error("Error updating admin profile:", err);
      toast.error("Could not update the profile.");
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async (event: FormEvent) => {
    event.preventDefault();
    const newPasswordError = validatePassword(newPassword);
    const confirmPasswordError =
      confirmPassword !== newPassword ? "Passwords do not match." : undefined;
    setPasswordErrors({ newPassword: newPasswordError, confirmPassword: confirmPasswordError });
    if (newPasswordError || confirmPasswordError) return;

    setSavingPassword(true);
    // Mock — backend integration comes later.
    await new Promise((resolve) => setTimeout(resolve, 350));
    setNewPassword("");
    setConfirmPassword("");
    setSavingPassword(false);
    toast.success("Password updated. (Mock — backend wiring comes later.)");
  };

  const handleToggleFlag = async (flag: AdminFeatureFlag) => {
    setTogglingFlag(flag.id);
    try {
      const updated = await opsService.updateFeatureFlag(flag.id, !flag.enabled);
      setFlags((prev) =>
        prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : prev,
      );
      toast.success(
        updated.enabled
          ? `${updated.label} was enabled.`
          : `${updated.label} was disabled.`,
      );
    } catch (error) {
      console.error("Error updating feature flag:", error);
      toast.error("Could not update the feature flag.");
    } finally {
      setTogglingFlag(null);
    }
  };

  const downloadCsv = (kind: "organizations" | "users" | "payments") => {
    setExporting(kind);
    const csv = opsService.buildAdminCsv(kind);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relayo-${kind}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    toast.success(`${kind.charAt(0).toUpperCase() + kind.slice(1)} exported.`);
  };

  const auditRows = useMemo(() => {
    const list = audit ?? [];
    let rows = list;
    if (auditCategory !== "all") {
      rows = rows.filter((entry) => entry.category === auditCategory);
    }
    if (auditActor !== "all") {
      rows = rows.filter((entry) => entry.actorType === auditActor);
    }
    const query = auditQuery.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (entry) =>
          entry.action.toLowerCase().includes(query) ||
          entry.target.toLowerCase().includes(query) ||
          (entry.actorEmail ?? "").toLowerCase().includes(query),
      );
    }
    return rows.slice(0, 60);
  }, [audit, auditCategory, auditActor, auditQuery]);

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Admin settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage the platform owner, feature flags, exports and the audit log.
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleSaveName} className="space-y-4">
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <FiUser className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Profile
            </h2>
            <div className="space-y-4">
              <Input
                label="Display name"
                value={name}
                onChange={handleNameChange}
                error={nameError}
                disabled={savingName}
              />
              <Input
                label="Email"
                type="email"
                value={profile.email}
                readOnly
                hint="The admin account cannot be renamed."
              />
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="submit" isLoading={savingName}>
                Save profile
              </Button>
            </div>
          </Card>
        </form>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <FiLock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Security
          </h2>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <FiShield size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Multi-factor authentication · Enabled
              </p>
              <p className="text-xs text-muted-foreground">
                MFA is enforced on every admin sign-in and cannot be disabled.
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Last sign-in: {formatDate(profile.lastLoginAt)}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <FiFileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Feature flags
          </h2>
          {flags === null ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6 text-indigo-500" />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/70">
              {flags.map((flag) => (
                <li key={flag.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {flag.label}
                      {flag.dangerous && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-300">
                          <FiAlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                          Dangerous
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {flag.description}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={flag.enabled}
                    aria-label={`Toggle ${flag.label}`}
                    disabled={togglingFlag === flag.id}
                    onClick={() => handleToggleFlag(flag)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                      flag.enabled ? "bg-indigo-600" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        flag.enabled ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <FiDownload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Export data
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Download CSV snapshots of the platform.
          </p>
          <div className="mt-4 space-y-3">
            {(
              [
                ["organizations", "Organizations"],
                ["users", "Users"],
                ["payments", "Payments"],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                disabled={exporting !== null}
                onClick={() => downloadCsv(kind)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-input px-4 py-3 text-left transition-colors hover:border-indigo-400/40 hover:bg-muted disabled:opacity-60"
              >
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {exporting === kind ? "Preparing…" : `relayo-${kind}.csv`}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <form onSubmit={handleSavePassword} className="mt-6 max-w-2xl">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <FiKey className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Change password
          </h2>
          <div className="space-y-4">
            <PasswordInput
              label="New password"
              placeholder="6+ characters"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={passwordErrors.newPassword}
              disabled={savingPassword}
            />
            <PasswordInput
              label="Confirm new password"
              placeholder="Repeat the new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={passwordErrors.confirmPassword}
              disabled={savingPassword}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" isLoading={savingPassword}>
              Update password
            </Button>
          </div>
        </Card>
      </form>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Audit log
            </h2>
            <p className="text-xs text-muted-foreground">
              Admin, user and system actions across the platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AdminSearchInput
              value={auditQuery}
              onChange={setAuditQuery}
              placeholder="Action, target, actor…"
              className="w-full sm:w-56"
            />
            <select
              aria-label="Filter by category"
              value={auditCategory}
              onChange={(event) =>
                setAuditCategory(event.target.value as AdminAuditCategory | "all")
              }
              className={selectClasses}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by actor"
              value={auditActor}
              onChange={(event) => setAuditActor(event.target.value)}
              className={selectClasses}
            >
              <option value="all">All actors</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          {audit === null ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6 text-indigo-500" />
            </div>
          ) : auditRows.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              No audit entries match these filters.
            </Card>
          ) : (
            <TableWrapper>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Category</TH>
                  <TH>Action</TH>
                  <TH>Target</TH>
                  <TH>IP</TH>
                  <TH>Location</TH>
                </TR>
              </THead>
              <tbody>
                {auditRows.map((entry) => (
                  <TR key={entry.id}>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {timeAgo(entry.timestamp)}
                    </TD>
                    <TD className="text-xs">
                      <span className="font-medium text-foreground">
                        {entry.actorEmail ?? "System"}
                      </span>
                      <span className="ml-1.5 capitalize text-muted-foreground">
                        ({entry.actorType})
                      </span>
                    </TD>
                    <TD>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        {entry.category}
                      </span>
                    </TD>
                    <TD className="text-xs font-medium text-foreground">
                      {entry.action}
                    </TD>
                    <TD className="max-w-40 truncate text-xs text-muted-foreground">
                      {entry.target}
                    </TD>
                    <TD className="font-mono text-[11px] text-muted-foreground">
                      {entry.ip}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {entry.location}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminSettingsPage;