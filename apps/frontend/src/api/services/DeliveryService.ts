import type { DeliveryRow } from "../../types/dashboard";
import type { PagedResponse } from "../../types/pagination";
import { api } from "../axios";
import { deliveryEndpoints } from "../endpoints";

export async function listDeliveries(
  orgId: string,
  options: {
    destinationId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PagedResponse<DeliveryRow>> {
  const res = await api.get<{
    success: boolean;
    data: PagedResponse<DeliveryRow>;
  }>(deliveryEndpoints.LIST(orgId), {
    params: {
      ...(options.destinationId && { destinationId: options.destinationId }),
      ...(options.status && { status: options.status }),
      ...(options.page && { page: options.page }),
      ...(options.pageSize && { pageSize: options.pageSize }),
    },
  });

  return res.data.data;
}

export async function replayDelivery(
  orgId: string,
  deliveryId: string,
): Promise<DeliveryRow> {
  const res = await api.post<{ success: boolean; data: DeliveryRow }>(
    deliveryEndpoints.REPLAY(orgId, deliveryId),
  );

  return res.data.data;
}