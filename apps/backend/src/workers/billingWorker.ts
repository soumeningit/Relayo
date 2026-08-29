import { PaymentType, prisma } from "@repo/db";

const SCAN_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Downgrades orgs whose one-time 30-day period has lapsed back to FREE
 * (data is preserved — they simply pay once again to reactivate a paid plan).
 * Runs in the worker process (workers.ts) alongside the rate-limiter and
 * delivery workers.
 */
export async function runPlanDowngrades(): Promise<number> {
  const result = await prisma.organization.updateMany({
    where: {
      PaymentType: { in: [PaymentType.PRO, PaymentType.SCALE] },
      currentPeriodEnd: { lt: new Date() },
    },
    data: {
      PaymentType: PaymentType.FREE,
      paymentStatus: "INACTIVE",
    },
  });

  if (result.count > 0) {
    console.log(
      `[billing] Downgraded ${result.count} expired organization(s) to FREE`,
    );
  }

  return result.count;
}

export function startBillingWorkers() {
  const tick = () => {
    runPlanDowngrades().catch((error) => {
      console.error("[billing] downgrade scan failed:", error);
    });
  };

  tick();
  const timer = setInterval(tick, SCAN_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}