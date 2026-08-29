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

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
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
    currentPeriodEnd: string | null;
    /** Present for paid plans — the Razorpay order to open in the checkout modal. */
    order: PaymentOrder | null;
  };
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data: {
    captured: boolean;
    paymentType: PaymentPlanType;
    paymentStatus: OrganizationPaymentStatus;
    currentPeriodEnd: string | null;
    completedSteps: number;
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
  paymentType: PaymentPlanType;
  paymentStatus: OrganizationPaymentStatus;
  currentPeriodEnd: string | null;
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

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface OrgMember {
  /** Numeric membership id (serialized BigInt) */
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
  lastActiveAt: string | null;
}

export type InvitationChannel = "EMAIL" | "APP_NOTIFICATION";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface MemberInvitation {
  id: string;
  email: string;
  name: string | null;
  role: MemberRole;
  token: string;
  status: InvitationStatus;
  isRegistered: boolean;
  invitedAt: string;
  respondedAt: string | null;
  expiresAt: string;
  invitedBy: string;
}

/** Derive the delivery channel from whether the invitee already has an account. */
export function invitationChannel(
  invite: Pick<MemberInvitation, "isRegistered">,
): InvitationChannel {
  return invite.isRegistered ? "APP_NOTIFICATION" : "EMAIL";
}

export interface InviteMemberPayload {
  email: string;
  role: Exclude<MemberRole, "OWNER">;
}

export interface InviteMemberResponse {
  success: boolean;
  message: string;
  isRegistered: boolean;
}

export interface InviteeLookup {
  isRegistered: boolean;
  name: string | null;
}

export interface InvitationDetails {
  isValid: boolean;
  reason?: string;
  email?: string;
  name?: string | null;
  isRegistered?: boolean;
  orgName?: string;
  role?: MemberRole;
  inviterName?: string;
  expiresAt?: string;
}
