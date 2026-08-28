import type { Event, EventDetails } from "../../types/event";
import type { PagedResponse } from "../../types/pagination";
import { api } from "../axios";
import { eventEndpoints } from "../endpoints";

export async function listEvents(
  orgId: string,
  options: { page?: number; pageSize?: number; search?: string } = {},
): Promise<PagedResponse<Event>> {
  const res = await api.get<{ success: boolean; data: PagedResponse<Event> }>(
    `${eventEndpoints.LIST}/${encodeURIComponent(orgId)}`,
    {
      params: {
        ...(options.page && { page: options.page }),
        ...(options.pageSize && { pageSize: options.pageSize }),
        ...(options.search && { search: options.search }),
      },
    },
  );

  return res.data.data;
}

export async function getEventDetails(
  identifier: string,
  eventId: string,
): Promise<EventDetails> {
  const res = await api.get<{ success: boolean; data: EventDetails }>(
    eventEndpoints.DETAIL(identifier, eventId),
  );
  return res.data.data;
}
