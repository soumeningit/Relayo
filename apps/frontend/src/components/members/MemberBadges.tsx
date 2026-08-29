import type {
  InvitationChannel,
  InvitationStatus,
  MemberRole,
} from "../../types/org";

const ROLE_STYLES: Record<MemberRole, string> = {
  OWNER: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  ADMIN: "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  MEMBER: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  VIEWER: "border-border bg-muted text-muted-foreground",
};

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const CHANNEL_STYLES: Record<InvitationChannel, string> = {
  EMAIL: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  APP_NOTIFICATION:
    "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
};

const CHANNEL_LABELS: Record<InvitationChannel, string> = {
  EMAIL: "Email invite",
  APP_NOTIFICATION: "Relayo notification",
};

const STATUS_STYLES: Record<InvitationStatus, string> = {
  PENDING: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  ACCEPTED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  DECLINED: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  EXPIRED: "border-border bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

function badgeClass(base: string) {
  return `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${base}`;
}

export function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span className={badgeClass(ROLE_STYLES[role])}>{ROLE_LABELS[role]}</span>
  );
}

export function InviteChannelBadge({
  channel,
}: {
  channel: InvitationChannel;
}) {
  return (
    <span className={badgeClass(CHANNEL_STYLES[channel])}>
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

export function InvitationStatusBadge({
  status,
}: {
  status: InvitationStatus;
}) {
  return (
    <span className={badgeClass(STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}