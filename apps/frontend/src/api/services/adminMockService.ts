import { minutesAgo } from "../../lib/time";
import {
  appendAuditEntry,
  readMutations,
  readStatusOverrides,
  writeMutations,
  writeStatusOverrides,
} from "../mock/adminStore";
import type {
  AdminAuditEntry,
  AdminLoginResponse,
  AdminMember,
  AdminOrganization,
  AdminOrgStatus,
  AdminOverviewData,
  AdminPayment,
  AdminPlan,
  AdminProfile,
  AdminSessionUser,
  AdminUser,
  AdminUserStatus,
  AdminVerifyMfaResponse,
} from "../../types/admin";

export const ADMIN_DEMO_EMAIL = "admin@relayo.app";
export const ADMIN_DEMO_PASSWORD = "relayo-admin";

const ADMIN_PROFILE_KEY = "relayo-admin-profile";

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function randomToken(bytes: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const randoms = crypto.getRandomValues(new Uint8Array(bytes));
  randoms.forEach((byte) => {
    out += chars[byte % chars.length];
  });
  return out;
}

let currentMfaCode: string | null = null;

function generateOtp(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  currentMfaCode = code;
  return code;
}

/* ------------------------------------------------------------------ */
/* Auth (mock)                                                         */
/* ------------------------------------------------------------------ */

export async function adminLogin(data: {
  email: string;
  password: string;
}): Promise<AdminLoginResponse> {
  const email = data.email.trim().toLowerCase();
  const auditBase = {
    actorType: "admin" as const,
    actorEmail: ADMIN_DEMO_EMAIL,
    ip: "103.87.204.16",
    location: "Mumbai, IN",
  };
  if (email !== ADMIN_DEMO_EMAIL || data.password !== ADMIN_DEMO_PASSWORD) {
    appendAuditEntry({
      id: `aud_${Date.now()}_f`,
      timestamp: new Date().toISOString(),
      ...auditBase,
      category: "security",
      action: "Failed admin sign-in attempt",
      target: email || "(no email)",
    });
    throw new Error("Invalid email or password.");
  }
  const otp = generateOtp();
  return delay({
    success: true,
    email,
    mfaRequired: true,
    otp,
  });
}

export async function adminResendMfaCode(email: string): Promise<string> {
  if (email.trim().toLowerCase() !== ADMIN_DEMO_EMAIL) {
    throw new Error("Session expired — please sign in again.");
  }
  return delay(generateOtp(), 250);
}

export async function adminVerifyMfa(data: {
  email: string;
  otp: string;
}): Promise<AdminVerifyMfaResponse> {
  const auditBase = {
    actorType: "admin" as const,
    actorEmail: ADMIN_DEMO_EMAIL,
    ip: "103.87.204.16",
    location: "Mumbai, IN",
  };
  if (data.email.trim().toLowerCase() !== ADMIN_DEMO_EMAIL) {
    throw new Error("Session expired — please sign in again.");
  }
  if (!currentMfaCode || data.otp.trim() !== currentMfaCode) {
    appendAuditEntry({
      id: `aud_${Date.now()}_m`,
      timestamp: new Date().toISOString(),
      ...auditBase,
      category: "security",
      action: "Failed MFA verification",
      target: ADMIN_DEMO_EMAIL,
    });
    throw new Error("Invalid verification code. Please try again.");
  }

  const user: AdminSessionUser = {
    id: "usr_admin",
    name: "Relayo Admin",
    email: ADMIN_DEMO_EMAIL,
  };
  persistProfile({ ...readProfile(), lastLoginAt: new Date().toISOString() });
  appendAuditEntry({
    id: `aud_${Date.now()}_s`,
    timestamp: new Date().toISOString(),
    ...auditBase,
    category: "auth",
    action: "Admin signed in",
    target: "Admin console",
  });

  return delay({ success: true, token: `relayo_admin_${randomToken(24)}`, user });
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

interface StoredProfile {
  name: string;
  lastLoginAt: string;
}

function defaultProfile(): StoredProfile {
  return { name: "Relayo Admin", lastLoginAt: minutesAgo(60 * 24) };
}

function readProfile(): StoredProfile {
  try {
    const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
    return raw ? { ...defaultProfile(), ...(JSON.parse(raw) as StoredProfile) } : defaultProfile();
  } catch {
    return defaultProfile();
  }
}

function persistProfile(profile: StoredProfile) {
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
}

export async function getAdminProfile(): Promise<AdminProfile> {
  const stored = readProfile();
  return delay({
    name: stored.name,
    email: ADMIN_DEMO_EMAIL,
    mfaEnabled: true,
    lastLoginAt: stored.lastLoginAt,
  });
}

export async function updateAdminProfile(name: string): Promise<AdminProfile> {
  const next = { ...readProfile(), name: name.trim() || "Relayo Admin" };
  persistProfile(next);
  return delay({
    name: next.name,
    email: ADMIN_DEMO_EMAIL,
    mfaEnabled: true,
    lastLoginAt: next.lastLoginAt,
  });
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

const seedOrganizations: AdminOrganization[] = [
  {
    id: "org_01",
    name: "Acme Corp",
    slug: "acme-corp",
    plan: "PRO",
    status: "active",
    memberCount: 12,
    mrr: 999,
    createdAt: minutesAgo(60 * 24 * 210),
  },
  {
    id: "org_02",
    name: "Globex Engineering",
    slug: "globex",
    plan: "SCALE",
    status: "active",
    memberCount: 34,
    mrr: 2999,
    createdAt: minutesAgo(60 * 24 * 168),
  },
  {
    id: "org_03",
    name: "Initech",
    slug: "initech",
    plan: "PRO",
    status: "suspended",
    memberCount: 8,
    mrr: 999,
    createdAt: minutesAgo(60 * 24 * 140),
  },
  {
    id: "org_04",
    name: "Umbrella Labs",
    slug: "umbrella-labs",
    plan: "SCALE",
    status: "active",
    memberCount: 21,
    mrr: 2999,
    createdAt: minutesAgo(60 * 24 * 96),
  },
  {
    id: "org_05",
    name: "Stark Industries",
    slug: "stark-industries",
    plan: "FREE",
    status: "active",
    memberCount: 5,
    mrr: 0,
    createdAt: minutesAgo(60 * 24 * 61),
  },
  {
    id: "org_06",
    name: "Wayne Enterprises",
    slug: "wayne-enterprises",
    plan: "PRO",
    status: "active",
    memberCount: 17,
    mrr: 999,
    createdAt: minutesAgo(60 * 24 * 42),
  },
  {
    id: "org_07",
    name: "Hooli",
    slug: "hooli",
    plan: "FREE",
    status: "active",
    memberCount: 3,
    mrr: 0,
    createdAt: minutesAgo(60 * 24 * 18),
  },
];

const seedPayments: AdminPayment[] = [
  {
    id: "pay_01",
    organizationId: "org_02",
    organizationName: "Globex Engineering",
    plan: "SCALE",
    amount: 2999,
    status: "paid",
    paidAt: minutesAgo(60 * 3),
  },
  {
    id: "pay_02",
    organizationId: "org_04",
    organizationName: "Umbrella Labs",
    plan: "SCALE",
    amount: 2999,
    status: "paid",
    paidAt: minutesAgo(60 * 26),
  },
  {
    id: "pay_03",
    organizationId: "org_01",
    organizationName: "Acme Corp",
    plan: "PRO",
    amount: 999,
    status: "paid",
    paidAt: minutesAgo(60 * 47),
  },
  {
    id: "pay_04",
    organizationId: "org_06",
    organizationName: "Wayne Enterprises",
    plan: "PRO",
    amount: 999,
    status: "pending",
    paidAt: minutesAgo(60 * 5),
  },
  {
    id: "pay_05",
    organizationId: "org_03",
    organizationName: "Initech",
    plan: "PRO",
    amount: 999,
    status: "failed",
    paidAt: minutesAgo(60 * 30),
  },
  {
    id: "pay_06",
    organizationId: "org_05",
    organizationName: "Stark Industries",
    plan: "PRO",
    amount: 999,
    status: "refunded",
    paidAt: minutesAgo(60 * 24 * 3),
  },
  {
    id: "pay_07",
    organizationId: "org_01",
    organizationName: "Acme Corp",
    plan: "PRO",
    amount: 999,
    status: "paid",
    paidAt: minutesAgo(60 * 24 * 30),
  },
  {
    id: "pay_08",
    organizationId: "org_02",
    organizationName: "Globex Engineering",
    plan: "SCALE",
    amount: 2999,
    status: "paid",
    paidAt: minutesAgo(60 * 24 * 29.5),
  },
];

const seedMembers: Record<string, AdminMember[]> = {
  org_01: [
    {
      id: "mem_01",
      name: "Peter Parker",
      email: "peter@acmecorp.com",
      role: "OWNER",
      joinedAt: minutesAgo(60 * 24 * 210),
    },
    {
      id: "mem_02",
      name: "Mary Jane Watson",
      email: "mary@acmecorp.com",
      role: "ADMIN",
      joinedAt: minutesAgo(60 * 24 * 180),
    },
    {
      id: "mem_03",
      name: "Ned Leeds",
      email: "ned@acmecorp.com",
      role: "MEMBER",
      joinedAt: minutesAgo(60 * 24 * 95),
    },
    {
      id: "mem_04",
      name: "Gwen Stacy",
      email: "gwen@acmecorp.com",
      role: "MEMBER",
      joinedAt: minutesAgo(60 * 24 * 40),
    },
  ],
  org_02: [
    {
      id: "mem_05",
      name: "Hank Scorpio",
      email: "hank@globex.io",
      role: "OWNER",
      joinedAt: minutesAgo(60 * 24 * 168),
    },
    {
      id: "mem_06",
      name: "Bob Dobalina",
      email: "bob@globex.io",
      role: "ADMIN",
      joinedAt: minutesAgo(60 * 24 * 120),
    },
  ],
  org_04: [
    {
      id: "mem_07",
      name: "Albert Wesker",
      email: "wesker@umbrella.lab",
      role: "OWNER",
      joinedAt: minutesAgo(60 * 24 * 96),
    },
  ],
  org_06: [
    {
      id: "mem_08",
      name: "Bruce Wayne",
      email: "bruce@wayne.co",
      role: "OWNER",
      joinedAt: minutesAgo(60 * 24 * 42),
    },
    {
      id: "mem_09",
      name: "Lucius Fox",
      email: "lucius@wayne.co",
      role: "ADMIN",
      joinedAt: minutesAgo(60 * 24 * 30),
    },
  ],
};

const seedUsers: AdminUser[] = [
  {
    id: "u_01",
    name: "Peter Parker",
    email: "peter@acmecorp.com",
    status: "verified",
    mfaEnabled: true,
    organizationCount: 2,
    joinedAt: minutesAgo(60 * 24 * 210),
  },
  {
    id: "u_02",
    name: "Hank Scorpio",
    email: "hank@globex.io",
    status: "verified",
    mfaEnabled: true,
    organizationCount: 1,
    joinedAt: minutesAgo(60 * 24 * 168),
  },
  {
    id: "u_03",
    name: "Michael Bolton",
    email: "michael@initech.com",
    status: "verified",
    mfaEnabled: false,
    organizationCount: 1,
    joinedAt: minutesAgo(60 * 24 * 140),
  },
  {
    id: "u_04",
    name: "Albert Wesker",
    email: "wesker@umbrella.lab",
    status: "verified",
    mfaEnabled: true,
    organizationCount: 1,
    joinedAt: minutesAgo(60 * 24 * 96),
  },
  {
    id: "u_05",
    name: "Tony Stark",
    email: "tony@stark.co",
    status: "verified",
    mfaEnabled: true,
    organizationCount: 3,
    joinedAt: minutesAgo(60 * 24 * 61),
  },
  {
    id: "u_06",
    name: "Bruce Wayne",
    email: "bruce@wayne.co",
    status: "verified",
    mfaEnabled: true,
    organizationCount: 1,
    joinedAt: minutesAgo(60 * 24 * 42),
  },
  {
    id: "u_07",
    name: "Gavin Belson",
    email: "gavin@hooli.dev",
    status: "unverified",
    mfaEnabled: false,
    organizationCount: 1,
    joinedAt: minutesAgo(60 * 24 * 18),
  },
  {
    id: "u_08",
    name: "Mina Cooper",
    email: "mina@kaos.inc",
    status: "verified",
    mfaEnabled: false,
    organizationCount: 4,
    joinedAt: minutesAgo(60 * 24 * 12),
  },
];

/* ------------------------------------------------------------------ */
/* Status overrides (localStorage)                                     */
/* ------------------------------------------------------------------ */

const PLAN_MRR: Record<AdminPlan, number> = { FREE: 0, PRO: 999, SCALE: 2999 };

function applyOrgStatus(org: AdminOrganization): AdminOrganization {
  const status = readStatusOverrides().organizations[org.id];
  const mutations = readMutations();
  const plan = mutations.orgPlans[org.id] ?? org.plan;
  return {
    ...org,
    status: status ?? org.status,
    plan,
    mrr: PLAN_MRR[plan],
  };
}

function applyUserStatus(user: AdminUser): AdminUser {
  const status = readStatusOverrides().users[user.id];
  const mfaOff = readMutations().userMfaOff[user.id] === true;
  return { ...user, status: status ?? user.status, mfaEnabled: user.mfaEnabled && !mfaOff };
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

const PLAN_LABELS: Record<string, string> = {
  PRO: "Pro",
  SCALE: "Scale",
};

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const organizations = getSeedOrganizations();
  const activeOrganizations = organizations.filter(
    (org) => org.status === "active",
  ).length;
  const suspendedOrganizations = organizations.length - activeOrganizations;

  const byPlan = organizations.reduce<Record<string, number>>(
    (acc, org) => {
      acc[org.plan] = (acc[org.plan] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const organizationsByPlan = Object.entries(byPlan)
    .map(([plan, count]) => ({
      plan: plan as "FREE",
      label: `${PLAN_LABELS[plan] ?? plan[0] + plan.slice(1).toLowerCase()}`,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const mrr = organizations
    .filter((org) => org.status === "active")
    .reduce((sum, org) => sum + org.mrr, 0);

  return delay({
    stats: {
      totalOrganizations: organizations.length,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers: seedUsers.length,
      events24h: 48291,
      deliveries30d: 1284933,
      successRatePct: 99.2,
      mrr,
    },
    organizationsByPlan,
    recentPayments: getSeedPayments()
      .sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt))
      .slice(0, 6),
  });
}

/* ------------------------------------------------------------------ */
/* Accessors (shared with other mock services)                         */
/* ------------------------------------------------------------------ */

function applyPaymentStatus(payment: AdminPayment): AdminPayment {
  const status = readMutations().paymentStatuses[payment.id];
  return status ? { ...payment, status } : payment;
}

export function getSeedOrganizations(): AdminOrganization[] {
  return seedOrganizations
    .map(applyOrgStatus)
    .filter((org) => !readMutations().deletedOrgIds.includes(org.id));
}

export function getSeedUsers(): AdminUser[] {
  return seedUsers.map(applyUserStatus);
}

export function getSeedPayments(): AdminPayment[] {
  return seedPayments.map(applyPaymentStatus);
}

function auditBase(): Omit<AdminAuditEntry, "id" | "timestamp" | "category" | "action" | "target"> {
  return {
    actorType: "admin",
    actorEmail: ADMIN_DEMO_EMAIL,
    ip: "103.87.204.16",
    location: "Mumbai, IN",
  };
}

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

export async function listAdminOrganizations(search?: string): Promise<AdminOrganization[]> {
  const organizations = getSeedOrganizations().sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );

  const query = search?.trim().toLowerCase();
  if (!query) return delay(organizations);

  return delay(
    organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        org.slug.toLowerCase().includes(query),
    ),
  );
}

export async function getAdminOrganization(id: string) {
  const organization = getSeedOrganizations().find((org) => org.id === id);
  if (!organization) throw new Error("Organization not found.");

  const payments = getSeedPayments()
    .filter((payment) => payment.organizationId === id)
    .sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
  const members = seedMembers[id] ?? [];

  return delay({
    organization,
    usage: {
      destinations: 6 + (parseInt(id.slice(-2), 10) % 9),
      events24h: 1200 + parseInt(id.slice(-2), 10) * 37,
      deliveries30d: 48000 + parseInt(id.slice(-2), 10) * 2400,
      successRatePct: 98 + (parseInt(id.slice(-2), 10) % 2),
      pendingRetries: parseInt(id.slice(-2), 10) % 7,
    },
    members,
    payments,
  });
}

export async function updateOrganizationStatus(
  id: string,
  status: AdminOrgStatus,
): Promise<AdminOrganization> {
  const organization = seedOrganizations.find((org) => org.id === id);
  if (!organization) throw new Error("Organization not found.");

  const overrides = readStatusOverrides();
  overrides.organizations[id] = status;
  writeStatusOverrides(overrides);

  appendAuditEntry({
    id: `aud_${Date.now()}_${status}`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "organization",
    action: status === "suspended" ? "Organization suspended" : "Organization reactivated",
    target: organization.name,
  });

  return delay(applyOrgStatus(organization));
}

export async function changeOrganizationPlan(
  id: string,
  plan: AdminPlan,
): Promise<AdminOrganization> {
  const organization = seedOrganizations.find((org) => org.id === id);
  if (!organization) throw new Error("Organization not found.");

  const mutations = readMutations();
  mutations.orgPlans[id] = plan;
  writeMutations(mutations);

  appendAuditEntry({
    id: `aud_${Date.now()}_plan`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "billing",
    action: `Plan changed to ${plan}`,
    target: organization.name,
  });

  return delay(applyOrgStatus(organization));
}

export async function extendOrganizationPeriod(id: string): Promise<Date> {
  const organization = seedOrganizations.find((org) => org.id === id);
  if (!organization) throw new Error("Organization not found.");

  const mutations = readMutations();
  const current = mutations.orgPeriodEnds[id]
    ? new Date(mutations.orgPeriodEnds[id])
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const next = new Date(Math.max(current.getTime(), Date.now()) + 30 * 24 * 60 * 60 * 1000);
  mutations.orgPeriodEnds[id] = next.toISOString();
  writeMutations(mutations);

  appendAuditEntry({
    id: `aud_${Date.now()}_ext`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "billing",
    action: "Billing period extended 30 days",
    target: organization.name,
  });

  return delay(next);
}

export async function deleteOrganization(id: string): Promise<void> {
  const organization = seedOrganizations.find((org) => org.id === id);
  if (!organization) throw new Error("Organization not found.");

  const mutations = readMutations();
  mutations.deletedOrgIds = [...mutations.deletedOrgIds, id];
  writeMutations(mutations);

  appendAuditEntry({
    id: `aud_${Date.now()}_del`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "organization",
    action: "Organization deleted",
    target: organization.name,
  });

  return delay(undefined);
}

export function getOrganizationNotes(id: string): string {
  return readMutations().orgNotes[id] ?? "";
}

export async function updateOrganizationNotes(id: string, notes: string): Promise<string> {
  const mutations = readMutations();
  mutations.orgNotes[id] = notes;
  writeMutations(mutations);
  appendAuditEntry({
    id: `aud_${Date.now()}_note`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "organization",
    action: "Internal notes updated",
    target: seedOrganizations.find((org) => org.id === id)?.name ?? id,
  });
  return delay(notes, 200);
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export async function listAdminUsers(search?: string): Promise<AdminUser[]> {
  const users = getSeedUsers();
  const query = search?.trim().toLowerCase();
  if (!query) return delay(users);

  return delay(
    users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    ),
  );
}

export async function updateUserStatus(
  id: string,
  status: AdminUserStatus,
): Promise<AdminUser> {
  const user = seedUsers.find((u) => u.id === id);
  if (!user) throw new Error("User not found.");

  const overrides = readStatusOverrides();
  overrides.users[id] = status;
  writeStatusOverrides(overrides);

  appendAuditEntry({
    id: `aud_${Date.now()}_usr`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "user",
    action:
      status === "suspended"
        ? "User account suspended"
        : status === "verified"
          ? "User verified"
          : "User marked unverified",
    target: user.email,
  });

  return delay(applyUserStatus({ ...user, status }));
}

export async function resetUserPassword(id: string): Promise<AdminUser> {
  const user = seedUsers.find((u) => u.id === id);
  if (!user) throw new Error("User not found.");

  appendAuditEntry({
    id: `aud_${Date.now()}_pwd`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "user",
    action: "Password reset requested",
    target: user.email,
  });

  return delay(applyUserStatus(user));
}

export async function disableUserMfa(id: string): Promise<AdminUser> {
  const user = seedUsers.find((u) => u.id === id);
  if (!user) throw new Error("User not found.");

  const mutations = readMutations();
  mutations.userMfaOff[id] = true;
  writeMutations(mutations);

  appendAuditEntry({
    id: `aud_${Date.now()}_mfa`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "security",
    action: "MFA disabled (forced reset)",
    target: user.email,
  });

  return delay(applyUserStatus(user));
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export async function listAdminPayments(status?: string): Promise<AdminPayment[]> {
  let payments = getSeedPayments().sort(
    (a, b) => +new Date(b.paidAt) - +new Date(a.paidAt),
  );
  if (status && status !== "all") {
    payments = payments.filter((payment) => payment.status === status);
  }
  return delay(payments);
}

export async function refundPayment(id: string): Promise<AdminPayment> {
  const payment = seedPayments.find((p) => p.id === id);
  if (!payment) throw new Error("Payment not found.");

  const mutations = readMutations();
  mutations.paymentStatuses[id] = "refunded";
  writeMutations(mutations);

  appendAuditEntry({
    id: `aud_${Date.now()}_refund`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "billing",
    action: `Payment ${id} refunded`,
    target: payment.organizationName,
  });

  return delay(applyPaymentStatus(payment));
}

export async function retryPayment(id: string): Promise<AdminPayment> {
  const payment = seedPayments.find((p) => p.id === id);
  if (!payment) throw new Error("Payment not found.");

  const mutations = readMutations();
  mutations.paymentStatuses[id] = "paid";
  writeMutations(mutations);

  appendAuditEntry({
    id: `aud_${Date.now()}_retry`,
    timestamp: new Date().toISOString(),
    ...auditBase(),
    category: "billing",
    action: `Payment ${id} retried successfully`,
    target: payment.organizationName,
  });

  return delay(applyPaymentStatus(payment));
}