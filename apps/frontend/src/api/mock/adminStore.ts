import type {
  AdminAuditEntry,
  AdminOrgStatus,
  AdminPaymentStatus,
  AdminPlan,
  AdminUserStatus,
} from "../../types/admin";

const STATUS_KEY = "relayo-admin-status-overrides";
const MUTATIONS_KEY = "relayo-admin-mutations";

export interface StatusOverrides {
  organizations: Record<string, AdminOrgStatus>;
  users: Record<string, AdminUserStatus>;
}

export interface AdminMutations {
  paymentStatuses: Record<string, AdminPaymentStatus>;
  orgPlans: Record<string, AdminPlan>;
  orgPeriodEnds: Record<string, string>;
  deletedOrgIds: string[];
  orgNotes: Record<string, string>;
  userMfaOff: Record<string, boolean>;
  flags: Record<string, boolean>;
  auditAppended: AdminAuditEntry[];
}

const EMPTY_MUTATIONS: AdminMutations = {
  paymentStatuses: {},
  orgPlans: {},
  orgPeriodEnds: {},
  deletedOrgIds: [],
  orgNotes: {},
  userMfaOff: {},
  flags: {},
  auditAppended: [],
};

export function readStatusOverrides(): StatusOverrides {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as StatusOverrides) : { organizations: {}, users: {} };
  } catch {
    return { organizations: {}, users: {} };
  }
}

export function writeStatusOverrides(overrides: StatusOverrides) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(overrides));
}

export function readMutations(): AdminMutations {
  try {
    const raw = localStorage.getItem(MUTATIONS_KEY);
    if (!raw) return { ...EMPTY_MUTATIONS };
    const parsed = JSON.parse(raw) as Partial<AdminMutations>;
    return { ...EMPTY_MUTATIONS, ...parsed };
  } catch {
    return { ...EMPTY_MUTATIONS };
  }
}

export function writeMutations(mutations: AdminMutations) {
  localStorage.setItem(MUTATIONS_KEY, JSON.stringify(mutations));
}

export function appendAuditEntry(entry: AdminAuditEntry) {
  const mutations = readMutations();
  mutations.auditAppended = [entry, ...mutations.auditAppended].slice(0, 400);
  writeMutations(mutations);
}