import { api } from "../axios";
import { orgEndpoints } from "../endpoints";
import type {
  CreateOrgRequest,
  CreateOrgResponse,
  InviteMemberPayload,
  InviteMemberResponse,
  InviteeLookup,
  MemberInvitation,
  MemberRole,
  OrgFull,
  OrgMember,
  OrgSummary,
  SubmitOrgDetailsRequest,
  SubmitOrgDetailsResponse,
  SubmitPaymentRequest,
  SubmitPaymentResponse,
  UpdateOrgRequest,
  UpdateOrgResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "../../types/org";

interface ListEnvelope<T> {
  success: boolean;
  message: string;
  data: T[];
}

export async function createOrg(payload: CreateOrgRequest) {
  const response = await api.post<CreateOrgResponse>(
    orgEndpoints.CREATE,
    payload,
  );
  return response.data;
}

export async function getMyOrganizations() {
  const response = await api.get<ListEnvelope<OrgSummary>>(orgEndpoints.MINE);
  return response.data.data;
}

export async function getOrganization(identifier: string) {
  const response = await api.get<{ success: boolean; data: OrgFull }>(
    orgEndpoints.DETAIL(identifier),
  );
  return response.data.data;
}

export async function submitPayment(
  identifier: string,
  payload: SubmitPaymentRequest,
) {
  const response = await api.patch<SubmitPaymentResponse>(
    orgEndpoints.SUBMIT_PAYMENT(identifier),
    payload,
  );
  return response.data;
}

export async function verifyPayment(
  identifier: string,
  payload: VerifyPaymentRequest,
) {
  const response = await api.post<VerifyPaymentResponse>(
    orgEndpoints.VERIFY_PAYMENT(identifier),
    payload,
  );
  return response.data;
}

export async function updateOrganization(
  identifier: string,
  payload: UpdateOrgRequest,
) {
  const response = await api.patch<UpdateOrgResponse>(
    orgEndpoints.DETAIL(identifier),
    payload,
  );
  return response.data;
}

export async function submitOrganizationDetails(
  identifier: string,
  payload: SubmitOrgDetailsRequest,
) {
  const body = {
    ...payload,
    metaData:
      payload.metaData && Object.keys(payload.metaData).length > 0
        ? payload.metaData
        : undefined,
  };
  const response = await api.patch<SubmitOrgDetailsResponse>(
    orgEndpoints.SUBMIT_DETAILS(identifier),
    body,
  );
  return response.data;
}

export async function listMembers(
  identifier: string,
): Promise<{ members: OrgMember[]; invitations: MemberInvitation[] }> {
  const response = await api.get<{
    success: boolean;
    data: { members: OrgMember[]; invitations: MemberInvitation[] };
  }>(orgEndpoints.MEMBERS(identifier));
  return response.data.data;
}

export async function inviteMember(
  identifier: string,
  payload: InviteMemberPayload,
): Promise<InviteMemberResponse> {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: InviteMemberResponse;
  }>(orgEndpoints.INVITE_MEMBER(identifier), payload);
  return response.data.data;
}

export async function lookupInvitee(
  identifier: string,
  email: string,
): Promise<InviteeLookup> {
  const response = await api.post<{ success: boolean; data: InviteeLookup }>(
    orgEndpoints.INVITE_LOOKUP(identifier),
    { email },
  );
  return response.data.data;
}

export async function removeMember(identifier: string, memberId: string) {
  await api.delete(orgEndpoints.REMOVE_MEMBER(identifier, memberId));
}

export async function changeMemberRole(
  identifier: string,
  memberId: string,
  role: Exclude<MemberRole, "OWNER">,
) {
  const response = await api.patch(
    orgEndpoints.CHANGE_MEMBER_ROLE(identifier, memberId),
    { role },
  );
  return response.data;
}

export async function revokeInvitation(identifier: string, inviteId: string) {
  await api.delete(orgEndpoints.REVOKE_INVITE(identifier, inviteId));
}

export async function resendInvitation(identifier: string, inviteId: string) {
  const response = await api.post(orgEndpoints.RESEND_INVITE(identifier, inviteId));
  return response.data;
}
