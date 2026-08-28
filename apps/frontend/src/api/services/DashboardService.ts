import type {
  DashboardStats,
  DeliveryRow,
  Destination,
} from "../../types/dashboard";
import { api } from "../axios";
import { dashboardEndpoints } from "../endpoints";

export interface DashboardOverview {
  stats: DashboardStats;
  destinations: Destination[];
  recent: DeliveryRow[];
}

export async function getOverview(orgId: string): Promise<DashboardOverview> {
  const res = await api.get<{ success: boolean; data: DashboardOverview }>(
    dashboardEndpoints.OVERVIEW(orgId),
  );
  return res.data.data;
}