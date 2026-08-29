import { useCallback, useEffect, useState } from "react";
import { FiZap } from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "../ui";
import { PageLoader } from "../ui/Spinner";
import { getOrganization } from "../../api/services/OrgService";
import { useTenant } from "../../contexts/TenantContext";
import { useRazorpayCheckout } from "../../hooks/useRazorpayCheckout";
import { getApiErrorMessage } from "../../lib/apiError";
import { plans } from "../../data/pricing";
import type { ApiPlanId } from "../../data/pricing";
import type { OrgFull } from "../../types/org";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BillingSection() {
  const { tenant } = useTenant();
  const slug = tenant?.slug;
  const { createCheckout, status: checkoutStatus } = useRazorpayCheckout();

  const [org, setOrg] = useState<OrgFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await getOrganization(slug);
      setOrg(data);
    } catch {
      setOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    getOrganization(slug)
      .then((data) => {
        if (!cancelled) setOrg(data);
      })
      .catch(() => {
        if (!cancelled) setOrg(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const pay = async (planId: ApiPlanId) => {
    if (!slug) return;
    try {
      const result = await createCheckout(slug, planId);
      if (result.kind === "paid") {
        toast.success(
          `Payment received. Active until ${formatDate(
            result.response.data.currentPeriodEnd,
          )}.`,
        );
      } else {
        toast.success("You are now on the Free plan.");
      }
      await refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  if (isLoading) return <PageLoader />;

  const paymentType = org?.paymentType ?? "FREE";
  const paymentStatus = org?.paymentStatus ?? "PENDING";
  const periodEnd = org?.currentPeriodEnd ?? null;

  // The billing worker flips an expired paid org to FREE/INACTIVE; a stored
  // "INACTIVE" here is the authoritative "period ended" signal.
  const isExpired =
    (paymentType === "PRO" || paymentType === "SCALE") &&
    paymentStatus === "INACTIVE";

  const plan = plans.find((p) => p.apiPlanId === paymentType);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-base font-semibold text-foreground">
        Billing
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One-time payment, no subscriptions. Each payment grants 30 days.
      </p>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-input/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
            <FiZap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Current Plan:{" "}
              <span className="font-bold">{plan?.name ?? paymentType}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {paymentType === "FREE"
                ? "Free plan — no payment required"
                : `${isExpired ? "Period ended" : "Active period"} · pays through ${formatDate(periodEnd)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {paymentType === "FREE" ? (
            <>
              <Button
                size="sm"
                isLoading={checkoutStatus !== "idle"}
                onClick={() => void pay("PRO")}
                disabled={checkoutStatus !== "idle"}
              >
                Get Pro · ₹999
              </Button>
              <Button
                size="sm"
                variant="outline"
                isLoading={checkoutStatus !== "idle"}
                onClick={() => void pay("SCALE")}
                disabled={checkoutStatus !== "idle"}
              >
                Get Scale · ₹2,999
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              isLoading={checkoutStatus !== "idle"}
              onClick={() => void pay(paymentType as ApiPlanId)}
              disabled={checkoutStatus !== "idle"}
            >
              {isExpired ? "Renew" : "Extend"} · 30 days
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        When your 30-day period ends, the organization automatically returns to
        the Free plan — your events and destinations are never deleted. Pay once
        again to continue with {plan ? `the ${plan.name} plan` : "a paid plan"}.
      </p>
    </div>
  );
}