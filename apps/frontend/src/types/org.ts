export interface OrgSummary {
  /** Public ORG-… id */
  id: string;
  name: string;
  slug: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  completedSteps: number;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentPlanType = "FREE" | "PRO" | "SCALE" | "ENTERPRISE";
export type OrganizationPaymentStatus =
  | "PENDING"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export interface SubmitPaymentRequest {
  planType: PaymentPlanType;
}

export interface SubmitPaymentResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    slug: string;
    paymentType: PaymentPlanType;
    status: OrgSummary["status"];
    completedSteps: number;
    paymentStatus: OrganizationPaymentStatus;
  };
}

export interface OrgDetailsBlock {
  description: string | null;
  logoUrl: string | null;
  address: string | null;
  phoneNumber: string | null;
  website: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberBlock {
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  user: { userId: string; name: string; email: string };
}

/** GET /org/:identifier response — uses organizationId key like the API */
export interface OrgFull {
  organizationId: string;
  name: string;
  slug: string;
  status: OrgSummary["status"];
  completedSteps: number;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
  details: OrgDetailsBlock | null;
  members?: OrgMemberBlock[];
}

export interface CreateOrgRequest {
  name: string;
  orgEmail: string;
}

export interface CreateOrgData {
  id: string;
  name: string;
  slug: string;
}

export interface CreateOrgResponse {
  success: boolean;
  message: string;
  data: CreateOrgData;
}

export interface SubmitOrgDetailsRequest {
  description?: string;
  website?: string;
  address?: string;
  phone?: string;
  metaData?: Record<string, unknown>;
}

export interface UpdateOrgRequest {
  name?: string;
  contactEmail?: string;
}

export interface UpdateOrgResponse {
  success: boolean;
  message: string;
  data: OrgSummary;
}

export interface SubmitOrgDetailsResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    website: string | null;
    address: string | null;
    phone: string | null;
  };
}
