import { z } from "zod";

export const getDashboardOverviewSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
});