import { api } from "../axios";
import { inviteEndpoints } from "../endpoints";
import type { InvitationDetails, MemberRole } from "../../types/org";

export async function getInvitationDetails(token: string) {
  const response = await api.get<{ success: boolean; data: InvitationDetails }>(
    inviteEndpoints.DETAIL(token),
  );
  return response.data.data;
}

export interface RespondInviteResult {
  success: boolean;
  message: string;
  email: string;
  orgName: string | null;
  role: MemberRole;
  registrationToken?: string;
}

export async function respondInvite(token: string, response: "accept" | "decline") {
  const result = await api.post<{
    success: boolean;
    message: string;
    data: RespondInviteResult;
  }>(inviteEndpoints.RESPOND, { token, response });
  return result.data.data;
}