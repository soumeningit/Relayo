import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCheckCircle,
  FiEdit3,
  FiFileText,
  FiMapPin,
  FiMoreHorizontal,
  FiTrash2,
  FiUsers,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  Spinner,
  StatCard,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { DropdownMenu, MenuItem } from "../../components/ui/DropdownMenu";
import {
  OrgStatusBadge,
  PaymentStatusBadge,
  PlanBadge,
} from "../../components/admin/badges";
import type {
  AdminOrganizationDetail,
  AdminPlan,
} from "../../types/admin";
import { PLAN_LABELS } from "../../types/admin";
import { formatInr } from "../../lib/format";
import { formatDate, timeAgo } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as adminService from "../../api/services/adminApi";

const roleStyles: Record<string, string> = {
  OWNER: "text-indigo-500",
  ADMIN: "text-violet-500",
  MEMBER: "text-muted-foreground",
  VIEWER: "text-muted-foreground",
};

function AdminOrganizationDetailPage() {
  useDocumentMeta({
    title: "Organization detail",
    description: "Usage, members and billing for a single organization.",
  });

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminOrganizationDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    adminService
      .getAdminOrganization(id)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        adminService
          .getOrganizationNotes(id)
          .then((notes) => {
            if (cancelled) setNotes(notes);
          })
          .catch(() => {
            if (cancelled) setNotes(""); 
          });
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateOrg = (org: AdminOrganizationDetail["organization"]) => {
    setData((prev) => (prev ? { ...prev, organization: org } : prev));
  };

  const handlePlanChange = async (plan: AdminPlan) => {
    if (!data) return;
    setBusy(true);
    try {
      const updated = await adminService.changeOrganizationPlan(
        data.organization.id,
        plan,
      );
      updateOrg(updated);
      toast.success(
        `${data.organization.name} is now on the ${PLAN_LABELS[plan]} plan.`,
      );
    } catch (error) {
      console.error("Error changing plan:", error);
      toast.error("Could not change the plan.");
    } finally {
      setBusy(false);
    }
  };

  const handleExtendPeriod = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const next = await adminService.extendOrganizationPeriod(
        data.organization.id,
      );
      toast.success(
        `Billing period extended. Next renewal ${formatDate(next.toISOString())}.`,
      );
    } catch (error) {
      console.error("Error extending period:", error);
      toast.error("Could not extend the billing period.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!data) return;
    const next = data.organization.status === "active" ? "suspended" : "active";
    setBusy(true);
    try {
      const updated = await adminService.updateOrganizationStatus(
        data.organization.id,
        next,
      );
      updateOrg(updated);
      toast.success(
        next === "suspended"
          ? `${data.organization.name} was suspended.`
          : `${data.organization.name} is active again.`,
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Could not update the organization status.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await adminService.deleteOrganization(data.organization.id);
      toast.success(`${data.organization.name} was deleted.`);
      navigate("/admin/dashboard/organizations");
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error("Could not delete the organization.");
      setBusy(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!data) return;
    setSavingNotes(true);
    try {
      await adminService.updateOrganizationNotes(data.organization.id, notes);
      toast.success("Internal notes saved.");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Could not save the notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  if (notFound) {
    return (
      <EmptyState
        icon={<FiBriefcase />}
        title="Organization not found"
        description="It may have been removed, or the link is incorrect."
        action={
          <Link
            to="/admin/dashboard/organizations"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <FiArrowLeft aria-hidden="true" /> Back to organizations
          </Link>
        }
      />
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const { organization, usage, members, payments } = data;

  return (
    <div>
      <Link
        to="/admin/dashboard/organizations"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
      >
        <FiArrowLeft aria-hidden="true" /> All organizations
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {organization.name}
            </h1>
            <PlanBadge plan={organization.plan} />
            <OrgStatusBadge status={organization.status} />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            relayo.app/{organization.slug} · joined{" "}
            {formatDate(organization.createdAt)} · {organization.memberCount}{" "}
            members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/organizations"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <FiArrowLeft aria-hidden="true" /> Back
          </Link>
          <DropdownMenu
            trigger={
              <button
                aria-label={`Manage ${organization.name}`}
                disabled={busy}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <FiMoreHorizontal aria-hidden="true" />
              </button>
            }
          >
            {(close) => (
              <>
                <MenuItem disabled={busy} onClick={() => {
                  close();
                  handlePlanChange("FREE");
                }}>
                  Set plan to Free
                </MenuItem>
                <MenuItem disabled={busy} onClick={() => {
                  close();
                  handlePlanChange("PRO");
                }}>
                  Set plan to Pro
                </MenuItem>
                <MenuItem disabled={busy} onClick={() => {
                  close();
                  handlePlanChange("SCALE");
                }}>
                  Set plan to Scale
                </MenuItem>
                <MenuItem
                  disabled={busy}
                  icon={<FiRefreshCw size={15} />}
                  onClick={() => {
                    close();
                    handleExtendPeriod();
                  }}
                >
                  Extend billing period 30d
                </MenuItem>
                <MenuItem
                  disabled={busy}
                  danger={organization.status === "active"}
                  onClick={() => {
                    close();
                    handleToggleStatus();
                  }}
                >
                  {organization.status === "active" ? "Suspend" : "Reactivate"}
                </MenuItem>
                <MenuItem
                  disabled={busy}
                  danger
                  icon={<FiTrash2 size={15} />}
                  onClick={() => {
                    close();
                    setConfirmDelete(true);
                  }}
                >
                  Delete organization
                </MenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Destinations"
          value={usage.destinations}
          icon={<FiMapPin />}
        />
        <StatCard
          label="Events · 24h"
          value={usage.events24h.toLocaleString("en-IN")}
          icon={<FiFileText />}
        />
        <StatCard
          label="Deliveries · 30d"
          value={usage.deliveries30d.toLocaleString("en-IN")}
          icon={<FiRefreshCw />}
        />
        <StatCard
          label="Success rate"
          value={`${usage.successRatePct}%`}
          tone={usage.successRatePct >= 99 ? "success" : "warning"}
          hint={`${usage.pendingRetries} pending retries`}
          icon={<FiCheckCircle />}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="members-heading">
          <div className="mb-3 flex items-center gap-2">
            <FiUsers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2
              id="members-heading"
              className="font-display text-base font-semibold text-foreground"
            >
              Members
            </h2>
          </div>
          {members.length === 0 ? (
            <EmptyState
              icon={<FiUsers />}
              title="No members"
              description="Member details are not available for this organization."
            />
          ) : (
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Member</TH>
                  <TH>Role</TH>
                  <TH className="text-right">Joined</TH>
                </TR>
              </THead>
              <tbody>
                {members.map((member) => (
                  <TR key={member.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {member.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        </span>
                      </div>
                    </TD>
                    <TD>
                      <span
                        className={`text-xs font-semibold ${roleStyles[member.role] ?? roleStyles.MEMBER}`}
                      >
                        {member.role}
                      </span>
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {timeAgo(member.joinedAt)}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
          )}

          <div className="mt-6">
            <h2 className="mb-3 font-display text-base font-semibold text-foreground">
              Internal notes
            </h2>
            <div className="rounded-2xl border border-border bg-card p-5">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Add context for other admins — payment history, past incidents, escalation notes…"
                className="w-full resize-y rounded-xl border border-border bg-input px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-500 disabled:opacity-60"
                >
                  <FiEdit3 className="h-4 w-4" aria-hidden="true" />
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="payments-heading">
          <h2
            id="payments-heading"
            className="mb-3 font-display text-base font-semibold text-foreground"
          >
            Payments
          </h2>
          {payments.length === 0 ? (
            <EmptyState
              icon={<FiBriefcase />}
              title="No payments yet"
              description="This organization has never purchased a plan."
            />
          ) : (
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Plan</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH className="text-right">When</TH>
                </TR>
              </THead>
              <tbody>
                {payments.map((payment) => (
                  <TR key={payment.id}>
                    <TD>
                      <PlanBadge plan={payment.plan} />
                    </TD>
                    <TD className="font-mono text-xs">
                      {formatInr(payment.amount)}
                    </TD>
                    <TD>
                      <PaymentStatusBadge status={payment.status} />
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {timeAgo(payment.paidAt)}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => {
          if (!busy) setConfirmDelete(false);
        }}
        onConfirm={handleDelete}
        title="Delete organization"
        message={`Delete ${organization.name} (${organization.memberCount} members, ${PLAN_LABELS[organization.plan]} plan)? This permanently removes the account and all its data. This action cannot be undone.`}
        confirmLabel="Delete organization"
        isLoading={busy}
      />
    </div>
  );
}

export default AdminOrganizationDetailPage;