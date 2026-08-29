import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  FiBell,
  FiEye,
  FiLink,
  FiMail,
  FiMoreVertical,
  FiSend,
  FiShield,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  changeMemberRole,
  listMembers,
  removeMember,
  resendInvitation,
  revokeInvitation,
} from "../../api/services/OrgService";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  MenuItem,
  PageLoader,
  TableWrapper,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui";
import {
  InvitationStatusBadge,
  InviteChannelBadge,
  RoleBadge,
} from "../../components/members/MemberBadges";
import InviteMemberModal from "../../components/members/InviteMemberModal";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { formatDate, timeAgo } from "../../lib/time";
import { invitationChannel } from "../../types/org";
import type {
  InvitationChannel,
  MemberInvitation,
  MemberRole,
  OrgMember,
} from "../../types/org";

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const CHANNEL_ICONS: Record<InvitationChannel, ReactNode> = {
  EMAIL: <FiMail aria-hidden="true" />,
  APP_NOTIFICATION: <FiBell aria-hidden="true" />,
};

const ROLE_OPTIONS: Exclude<MemberRole, "OWNER">[] = [
  "ADMIN",
  "MEMBER",
  "VIEWER",
];

function channelIcon(channel: InvitationChannel) {
  return CHANNEL_ICONS[channel];
}

function roleIcon(role: Exclude<MemberRole, "OWNER">) {
  if (role === "ADMIN") return <FiShield aria-hidden="true" />;
  if (role === "MEMBER") return <FiUser aria-hidden="true" />;
  return <FiEye aria-hidden="true" />;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MembersPage() {
  useDocumentMeta({
    title: "Members",
    description: "Manage your organization members and invitations.",
  });

  const { user } = useAuth();
  const { tenant } = useTenant();

  const userEmail = user?.email?.toLowerCase() ?? "";

  const [data, setData] = useState<{
    members: OrgMember[];
    invitations: MemberInvitation[];
  } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgMember | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<MemberInvitation | null>(
    null,
  );

  const reload = useCallback(() => {
    if (!tenant?.id) return Promise.resolve();
    return listMembers(tenant.id).then(({ members, invitations }) =>
      setData({ members, invitations }),
    );
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    void reload();
  }, [tenant, reload]);

  if (!tenant) {
    return (
      <EmptyState
        icon={<FiUsers />}
        title="No organization yet"
        description="Members appear once your organization is set up."
      />
    );
  }

  if (!data) return <PageLoader />;

  const { members, invitations } = data;
  const pendingInvites = invitations.filter(
    (invite) => invite.status === "PENDING",
  );
  const historyInvites = invitations.filter(
    (invite) => invite.status !== "PENDING",
  );

  const isSelf = (member: OrgMember) =>
    member.email.toLowerCase() === userEmail;

  const selfMember = members.find((member) => isSelf(member));
  const isTeamManager =
    selfMember?.role === "OWNER" || selfMember?.role === "ADMIN";

  const canManage = (member: OrgMember) =>
    isTeamManager && member.role !== "OWNER" && !isSelf(member);

  const handleInviteSent = (info: {
    email: string;
    role: MemberRole;
    isRegistered: boolean;
  }) => {
    setInviteOpen(false);
    toast.success(
      info.isRegistered
        ? `Notification sent to ${info.email} — they can accept or reject it`
        : `Invitation email sent to ${info.email}`,
    );
    void reload();
  };

  const changeRole = async (
    member: OrgMember,
    role: Exclude<MemberRole, "OWNER">,
  ) => {
    setBusyId(member.id);
    try {
      await changeMemberRole(tenant.id, member.id, role);
      toast.success(`${member.name} is now ${ROLE_LABELS[role].toLowerCase()}`);
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the role",
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setBusyId(removeTarget.id);
    try {
      await removeMember(tenant.id, removeTarget.id);
      toast.success(`${removeTarget.name} was removed from the organization`);
      setRemoveTarget(null);
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the member",
      );
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (invite: MemberInvitation) => {
    setBusyId(invite.id);
    try {
      await resendInvitation(tenant.id, invite.id);
      toast.success(
        invite.isRegistered
          ? `Notification re-sent to ${invite.email}`
          : `Invitation email re-sent to ${invite.email}`,
      );
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not re-send the invite",
      );
    } finally {
      setBusyId(null);
    }
  };

  const copyInviteLink = async (invite: MemberInvitation) => {
    const url = `${window.location.origin}/invite/${invite.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Could not copy the invite link");
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setBusyId(revokeTarget.id);
    try {
      await revokeInvitation(tenant.id, revokeTarget.id);
      toast.success(`Invitation to ${revokeTarget.email} was cancelled`);
      setRevokeTarget(null);
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not cancel the invite",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Members
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite teammates to your organization and manage their roles.
          </p>
        </div>
        {isTeamManager && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <FiUserPlus aria-hidden="true" /> Invite member
          </Button>
        )}
      </div>

      {/* ---------- Members ---------- */}
      <div className="mt-6">
        <h2 className="mb-2 px-1 font-display text-base font-semibold text-foreground">
          Members ({members.length})
        </h2>
        <TableWrapper>
          <THead>
            <TR>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>Joined</TH>
              <TH>Last active</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {members.map((member) => (
              <TR key={member.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {member.name}
                        </span>
                        {isSelf(member) && (
                          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                            you
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <RoleBadge role={member.role} />
                </TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(member.joinedAt)}
                </TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">
                  {member.lastActiveAt ? timeAgo(member.lastActiveAt) : "—"}
                </TD>
                <TD className="text-right">
                  {canManage(member) ? (
                    <DropdownMenu
                      align="right"
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title={`Manage ${member.name}`}
                        >
                          <FiMoreVertical aria-hidden="true" />
                        </Button>
                      }
                    >
                      {(close) => (
                        <div>
                          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Change role
                          </div>
                          {ROLE_OPTIONS.map((role) =>
                            role === member.role ? null : (
                              <MenuItem
                                key={role}
                                icon={roleIcon(role)}
                                disabled={busyId === member.id}
                                onClick={() => {
                                  close();
                                  void changeRole(member, role);
                                }}
                              >
                                {ROLE_LABELS[role]}
                              </MenuItem>
                            ),
                          )}
                          <div className="my-1 h-px bg-border" />
                          <MenuItem
                            danger
                            icon={<FiTrash2 aria-hidden="true" />}
                            disabled={busyId === member.id}
                            onClick={() => {
                              close();
                              setRemoveTarget(member);
                            }}
                          >
                            Remove member
                          </MenuItem>
                        </div>
                      )}
                    </DropdownMenu>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* ---------- Pending invitations ---------- */}
      <div className="mt-8">
        <h2 className="mb-2 px-1 font-display text-base font-semibold text-foreground">
          Pending invitations ({pendingInvites.length})
        </h2>
        {pendingInvites.length === 0 ? (
          <EmptyState
            icon={<FiUsers />}
            title="No pending invitations"
            description="Invite someone to collaborate on this organization."
            action={
              isTeamManager ? (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <FiUserPlus aria-hidden="true" /> Invite member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center gap-3 p-4"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  {channelIcon(invitationChannel(invite))}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {invite.email}
                    </span>
                    {invite.name && (
                      <span className="truncate text-xs text-muted-foreground">
                        ({invite.name})
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <InviteChannelBadge channel={invitationChannel(invite)} />
                    <RoleBadge role={invite.role} />
                    <span className="text-xs text-muted-foreground">
                      sent {timeAgo(invite.invitedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Re-send invitation"
                    disabled={busyId === invite.id}
                    onClick={() => void resend(invite)}
                  >
                    <FiSend aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Copy invite link"
                    disabled={busyId === invite.id}
                    onClick={() => void copyInviteLink(invite)}
                  >
                    <FiLink aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Cancel invitation"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId === invite.id}
                    onClick={() => setRevokeTarget(invite)}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Recent responses ---------- */}
      {historyInvites.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 px-1 font-display text-base font-semibold text-foreground">
            Recent responses
          </h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {historyInvites.slice(0, 6).map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {invite.email}
                </span>
                <InviteChannelBadge channel={invitationChannel(invite)} />
                <InvitationStatusBadge status={invite.status} />
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {invite.respondedAt ? timeAgo(invite.respondedAt) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Modals ---------- */}
      {inviteOpen && (
        <InviteMemberModal
          open
          onClose={() => setInviteOpen(false)}
          orgIdentifier={tenant.id}
          onSent={handleInviteSent}
        />
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemove()}
        title="Remove member"
        message={
          removeTarget
            ? `Remove ${removeTarget.name} from this organization? They will lose access to destinations, events and API keys immediately.`
            : ""
        }
        confirmLabel="Remove member"
        isLoading={removeTarget !== null && busyId === removeTarget.id}
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void confirmRevoke()}
        title="Cancel invitation"
        message={
          revokeTarget
            ? `Cancel the invitation to ${revokeTarget.email}? They can no longer accept it.`
            : ""
        }
        confirmLabel="Cancel invitation"
        isLoading={revokeTarget !== null && busyId === revokeTarget.id}
      />
    </div>
  );
}