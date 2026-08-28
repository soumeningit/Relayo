import { api } from "../axios";
import { orgEndpoints } from "../endpoints";
import type {
  CreateOrgRequest,
  CreateOrgResponse,
  OrgFull,
  OrgSummary,
  SubmitOrgDetailsRequest,
  SubmitOrgDetailsResponse,
  SubmitPaymentRequest,
  SubmitPaymentResponse,
  UpdateOrgRequest,
  UpdateOrgResponse,
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
