import axios from "axios";
import { encryptStorage } from "../../lib/storage";
import type {
  AdminAuditEntry,
  AdminAuditCategory,
  AdminConfigStatus,
  AdminContactMessage,
  AdminDelivery,
  AdminDeliveryStatus,
  AdminDeliverySummary,
  AdminDestination,
  AdminEvent,
  AdminExpiredOrganization,
  AdminFeatureFlag,
  AdminHealth,
  AdminIncident,
  AdminLoginResponse,
  AdminOrganization,
  AdminOrganizationDetail,
  AdminOrgStatus,
  AdminOverviewData,
  AdminPayment,
  AdminPaymentStatus,
  AdminPlan,
  AdminProfile,
  AdminRevenueData,
  AdminSearchResults,
  AdminSessionUser,
  AdminUsageSummary,
  AdminUser,
  AdminUserStatus,
  AdminVerifyMfaResponse,
} from "../../types/admin";
import type {
  PagedResponse,
  PaginationParams,
} from "../../types/pagination";
import type { DocArticle, DocInput } from "../../types/docs";

export const ADMIN_DEMO_EMAIL = "admin@relayo.app";
export const ADMIN_DEMO_PASSWORD = "relayo-admin";

/** Demo-only hint shown on the login screen. Real sign-in uses the
 *  super admin's authenticator app — TOTP codes cannot be "resent". */
export async function adminResendMfaCode(_email: string): Promise<string> {
  void _email;
  return "";
}

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

adminApi.interceptors.request.use((config) => {
  const token = encryptStorage.getItem<string>("admin-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type Envelope<T> = { success: boolean; message: string; data: T };

async function unwrap<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] =>
      entry[1] !== undefined && entry[1] !== "",
  );
  const query = new URLSearchParams(
    entries.map(([key, value]) => [key, String(value)]),
  ).toString();
  return query ? `?${query}` : "";
}

function withPagination(
  filters: Record<string, string | undefined>,
  pagination?: PaginationParams,
): Record<string, string | number | undefined> {
  return {
    ...filters,
    ...(pagination?.page !== undefined ? { page: pagination.page } : {}),
    ...(pagination?.pageSize !== undefined ? { pageSize: pagination.pageSize } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function adminLogin(data: {
  email: string;
  password: string;
}): Promise<AdminLoginResponse> {
  const response = await adminApi.post<AdminLoginResponse>("/admin/auth/signin", data);
  return { ...response.data, email: data.email.trim().toLowerCase() };
}

export async function adminVerifyMfa(data: {
  email: string;
  otp: string;
}): Promise<AdminVerifyMfaResponse> {
  const response = await adminApi.post<{
    success: boolean;
    accessToken: string;
    user: { id: number; userId: string; name: string; email: string };
  }>("/admin/auth/verify-mfa", data);

  const user: AdminSessionUser = {
    id: response.data.user.userId,
    name: response.data.user.name,
    email: response.data.user.email,
  };

  return { success: true, token: response.data.accessToken, user };
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function getAdminProfile(): Promise<AdminProfile> {
  return unwrap(adminApi.get<Envelope<AdminProfile>>("/admin/auth/profile"));
}

export async function updateAdminProfile(name: string): Promise<AdminProfile> {
  return unwrap(adminApi.patch<Envelope<AdminProfile>>("/admin/auth/profile", { name }));
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export async function getAdminOverview(): Promise<AdminOverviewData> {
  return unwrap(adminApi.get<Envelope<AdminOverviewData>>("/admin/overview"));
}

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

export async function listAdminOrganizations(
  search?: string,
  pagination?: PaginationParams,
): Promise<PagedResponse<AdminOrganization>> {
  return unwrap(
    adminApi.get<Envelope<PagedResponse<AdminOrganization>>>(
      `/admin/organizations${qs(withPagination({ search }, pagination))}`,
    ),
  );
}

export async function getAdminOrganization(
  id: string,
): Promise<AdminOrganizationDetail> {
  return unwrap(
    adminApi.get<Envelope<AdminOrganizationDetail>>(
      `/admin/organizations/${encodeURIComponent(id)}`,
    ),
  );
}

export async function updateOrganizationStatus(
  id: string,
  status: AdminOrgStatus,
): Promise<AdminOrganization> {
  return unwrap(
    adminApi.patch<Envelope<AdminOrganization>>(
      `/admin/organizations/${encodeURIComponent(id)}/status`,
      { status },
    ),
  );
}

export async function changeOrganizationPlan(
  id: string,
  plan: AdminPlan,
): Promise<AdminOrganization> {
  return unwrap(
    adminApi.patch<Envelope<AdminOrganization>>(
      `/admin/organizations/${encodeURIComponent(id)}/plan`,
      { plan },
    ),
  );
}

export async function extendOrganizationPeriod(id: string): Promise<Date> {
  const iso = await unwrap(
    adminApi.post<Envelope<string>>(
      `/admin/organizations/${encodeURIComponent(id)}/extend`,
    ),
  );
  return new Date(iso);
}

export async function deleteOrganization(id: string): Promise<void> {
  await unwrap(
    adminApi.delete<Envelope<null>>(
      `/admin/organizations/${encodeURIComponent(id)}`,
    ),
  );
}

export async function getOrganizationNotes(id: string): Promise<string> {
  const data = await unwrap(
    adminApi.get<Envelope<{ notes: string }>>(
      `/admin/organizations/${encodeURIComponent(id)}/notes`,
    ),
  );
  return data.notes;
}

export async function updateOrganizationNotes(
  id: string,
  notes: string,
): Promise<string> {
  const data = await unwrap(
    adminApi.put<Envelope<{ notes: string }>>(
      `/admin/organizations/${encodeURIComponent(id)}/notes`,
      { notes },
    ),
  );
  return data.notes;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export async function listAdminUsers(
  search?: string,
  pagination?: PaginationParams,
): Promise<PagedResponse<AdminUser>> {
  return unwrap(
    adminApi.get<Envelope<PagedResponse<AdminUser>>>(
      `/admin/users${qs(withPagination({ search }, pagination))}`,
    ),
  );
}

export async function updateUserStatus(
  id: string,
  status: AdminUserStatus,
): Promise<AdminUser> {
  return unwrap(
    adminApi.patch<Envelope<AdminUser>>(
      `/admin/users/${encodeURIComponent(id)}/status`,
      { status },
    ),
  );
}

export async function resetUserPassword(id: string): Promise<AdminUser> {
  return unwrap(
    adminApi.post<Envelope<AdminUser>>(
      `/admin/users/${encodeURIComponent(id)}/reset-password`,
    ),
  );
}

export async function disableUserMfa(id: string): Promise<AdminUser> {
  return unwrap(
    adminApi.post<Envelope<AdminUser>>(
      `/admin/users/${encodeURIComponent(id)}/disable-mfa`,
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export async function listAdminPayments(
  status?: AdminPaymentStatus | "all",
): Promise<AdminPayment[]> {
  return unwrap(
    adminApi.get<Envelope<AdminPayment[]>>(
      `/admin/payments${qs({ status })}`,
    ),
  );
}

export async function refundPayment(id: string): Promise<AdminPayment> {
  return unwrap(
    adminApi.post<Envelope<AdminPayment>>(
      `/admin/payments/${encodeURIComponent(id)}/refund`,
    ),
  );
}

export async function retryPayment(id: string): Promise<AdminPayment> {
  return unwrap(
    adminApi.post<Envelope<AdminPayment>>(
      `/admin/payments/${encodeURIComponent(id)}/retry`,
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Revenue / usage / churn                                             */
/* ------------------------------------------------------------------ */

export async function getAdminRevenue(): Promise<AdminRevenueData> {
  return unwrap(adminApi.get<Envelope<AdminRevenueData>>("/admin/revenue"));
}

export async function getAdminUsage(): Promise<AdminUsageSummary[]> {
  return unwrap(adminApi.get<Envelope<AdminUsageSummary[]>>("/admin/usage"));
}

export async function listExpiredOrganizations(): Promise<AdminExpiredOrganization[]> {
  return unwrap(
    adminApi.get<Envelope<AdminExpiredOrganization[]>>("/admin/churn"),
  );
}

/* ------------------------------------------------------------------ */
/* Destinations / events / deliveries                                  */
/* ------------------------------------------------------------------ */

export async function listAdminDestinations(): Promise<AdminDestination[]> {
  return unwrap(
    adminApi.get<Envelope<AdminDestination[]>>("/admin/destinations"),
  );
}

export async function listAdminEvents(
  filters?: {
    organizationId?: string;
    eventType?: string;
    search?: string;
  },
  pagination?: PaginationParams,
): Promise<PagedResponse<AdminEvent>> {
  return unwrap(
    adminApi.get<Envelope<PagedResponse<AdminEvent>>>(
      `/admin/events${qs(withPagination(filters ?? {}, pagination))}`,
    ),
  );
}

export async function getAdminEvent(id: string): Promise<AdminEvent> {
  return unwrap(
    adminApi.get<Envelope<AdminEvent>>(`/admin/events/${encodeURIComponent(id)}`),
  );
}

export async function listAdminDeliveries(
  filters?: {
    organizationId?: string;
    status?: AdminDeliveryStatus | "";
    destinationId?: string;
    eventId?: string;
    search?: string;
  },
  pagination?: PaginationParams,
): Promise<PagedResponse<AdminDelivery> & { summary: AdminDeliverySummary }> {
  return unwrap(
    adminApi.get<Envelope<PagedResponse<AdminDelivery> & { summary: AdminDeliverySummary }>>(
      `/admin/deliveries${qs(withPagination(filters ?? {}, pagination))}`,
    ),
  );
}

export async function getAdminDelivery(id: string): Promise<AdminDelivery> {
  return unwrap(
    adminApi.get<Envelope<AdminDelivery>>(
      `/admin/deliveries/${encodeURIComponent(id)}`,
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Health + incidents                                                  */
/* ------------------------------------------------------------------ */

export async function listAdminIncidents(): Promise<AdminIncident[]> {
  return unwrap(adminApi.get<Envelope<AdminIncident[]>>("/admin/incidents"));
}

export async function listOpenIncidents(): Promise<AdminIncident[]> {
  return unwrap(adminApi.get<Envelope<AdminIncident[]>>("/admin/incidents/open"));
}

export async function getAdminHealth(): Promise<AdminHealth> {
  return unwrap(adminApi.get<Envelope<AdminHealth>>("/admin/health"));
}

/* ------------------------------------------------------------------ */
/* Audit / search / flags / config / export                            */
/* ------------------------------------------------------------------ */

export async function listAuditEntries(filters?: {
  category?: AdminAuditCategory | "";
  actorType?: string;
  query?: string;
}): Promise<AdminAuditEntry[]> {
  return unwrap(
    adminApi.get<Envelope<AdminAuditEntry[]>>(
      `/admin/audit${qs(filters ?? {})}`,
    ),
  );
}

export async function getAdminSearch(query: string): Promise<AdminSearchResults> {
  return unwrap(
    adminApi.get<Envelope<AdminSearchResults>>(`/admin/search${qs({ q: query })}`),
  );
}

export async function getFeatureFlags(): Promise<AdminFeatureFlag[]> {
  return unwrap(adminApi.get<Envelope<AdminFeatureFlag[]>>("/admin/flags"));
}

export async function updateFeatureFlag(
  id: string,
  enabled: boolean,
): Promise<AdminFeatureFlag> {
  return unwrap(
    adminApi.patch<Envelope<AdminFeatureFlag>>(
      `/admin/flags/${encodeURIComponent(id)}`,
      { enabled },
    ),
  );
}

export async function getConfigStatus(): Promise<AdminConfigStatus[]> {
  return unwrap(adminApi.get<Envelope<AdminConfigStatus[]>>("/admin/config"));
}

export async function buildAdminCsv(
  kind: "organizations" | "users" | "payments",
): Promise<string> {
  return unwrap(
    adminApi.get<Envelope<string>>(`/admin/export/${encodeURIComponent(kind)}`),
  );
}

/* ------------------------------------------------------------------ */
/* Docs                                                                */
/* ------------------------------------------------------------------ */

export async function listAdminDocs(): Promise<DocArticle[]> {
  return unwrap(adminApi.get<Envelope<DocArticle[]>>("/admin/docs"));
}

export async function getAdminDoc(id: string): Promise<DocArticle> {
  return unwrap(
    adminApi.get<Envelope<DocArticle>>(`/admin/docs/${encodeURIComponent(id)}`),
  );
}

export async function createAdminDoc(input: DocInput): Promise<DocArticle> {
  return unwrap(adminApi.post<Envelope<DocArticle>>("/admin/docs", input));
}

export async function updateAdminDoc(
  id: string,
  input: Partial<DocInput>,
): Promise<DocArticle> {
  return unwrap(
    adminApi.patch<Envelope<DocArticle>>(
      `/admin/docs/${encodeURIComponent(id)}`,
      input,
    ),
  );
}

export async function deleteAdminDoc(id: string): Promise<void> {
  await unwrap(
    adminApi.delete<Envelope<null>>(`/admin/docs/${encodeURIComponent(id)}`),
  );
}

/* ------------------------------------------------------------------ */
/* Contact inbox                                                       */
/* ------------------------------------------------------------------ */

export async function listContactMessages(
  filters: { search?: string; status?: string },
  pagination?: PaginationParams,
): Promise<PagedResponse<AdminContactMessage>> {
  return unwrap(
    adminApi.get<Envelope<PagedResponse<AdminContactMessage>>>(
      `/admin/contact-messages${qs(
        withPagination(
          {
            search: filters.search,
            status: filters.status,
          },
          pagination,
        ),
      )}`,
    ),
  );
}

export async function markContactRead(id: string): Promise<AdminContactMessage> {
  return unwrap(
    adminApi.patch<Envelope<AdminContactMessage>>(
      `/admin/contact-messages/${encodeURIComponent(id)}/read`,
    ),
  );
}

export async function archiveContactMessage(
  id: string,
): Promise<AdminContactMessage> {
  return unwrap(
    adminApi.patch<Envelope<AdminContactMessage>>(
      `/admin/contact-messages/${encodeURIComponent(id)}/archive`,
    ),
  );
}

export async function deleteContactMessage(id: string): Promise<void> {
  await unwrap(
    adminApi.delete<Envelope<null>>(
      `/admin/contact-messages/${encodeURIComponent(id)}`,
    ),
  );
}

export async function getContactMessage(
  id: string,
): Promise<AdminContactMessage> {
  return unwrap(
    adminApi.get<Envelope<AdminContactMessage>>(
      `/admin/contact-messages/${encodeURIComponent(id)}`,
    ),
  );
}

export async function replyToContactMessage(
  id: string,
  reply: string,
): Promise<AdminContactMessage> {
  return unwrap(
    adminApi.post<Envelope<AdminContactMessage>>(
      `/admin/contact-messages/${encodeURIComponent(id)}/reply`,
      { reply },
    ),
  );
}