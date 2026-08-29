import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowRight,
  FiCheck,
  FiCreditCard,
} from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { OnboardingShell } from "../../components/layout/OnboardingShell";
import { PageLoader } from "../../components/ui/Spinner";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useRazorpayCheckout } from "../../hooks/useRazorpayCheckout";
import { getApiErrorMessage } from "../../lib/apiError";
import { plans, type Plan } from "../../data/pricing";
import { useTenant } from "../../contexts/TenantContext";

function OnboardingPaymentPage() {
  useDocumentMeta({
    title: "Choose a plan",
    description: "Pick the Relayo plan for your organization.",
  });

  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant, isLoading, setTenant } = useTenant();
  const [selectedPlanId, setSelectedPlanId] = useState("pro");
  const { createCheckout, status: checkoutStatus } = useRazorpayCheckout();
  const submitting = checkoutStatus !== "idle";

  if (isLoading) return <PageLoader />;

  // No tenant yet → start at step 1
  if (!tenant) return <Navigate to="/dashboard/onboarding" replace />;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[1];

  const handleContinue = async () => {
    if (!slug || submitting) return;

    try {
      const result = await createCheckout(slug, selectedPlan.apiPlanId);

      if (result.kind === "free") {
        const data = result.response.data;
        setTenant({
          ...tenant,
          status: data.status,
          completedSteps: Math.max(
            tenant.completedSteps,
            data.completedSteps,
          ),
        });
        toast.success(`${selectedPlan.name} plan activated`);
      } else {
        const data = result.response.data;
        setTenant({
          ...tenant,
          status: "ACTIVE",
          completedSteps: Math.max(
            tenant.completedSteps,
            data.completedSteps,
          ),
        });
        toast.success(
          `Payment received. Your ${selectedPlan.name} plan is active until ${new Date(
            data.currentPeriodEnd as string,
          ).toLocaleDateString()}.`,
        );
      }

      navigate(`/dashboard/onboarding/${slug}/details`, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <OnboardingShell currentStep={2}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
        <FiCreditCard size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]">
        Choose a plan for {tenant?.name}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Pay once for a 30-day period — no subscriptions, no auto-renewal. When
        the period ends you simply pay once again.
      </p>

      <fieldset className="mt-6" disabled={submitting}>
        <legend className="sr-only">Select a plan</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              isSelected={selectedPlanId === plan.id}
              onSelect={() => setSelectedPlanId(plan.id)}
              disabled={submitting}
            />
          ))}
        </div>

        {/* Selected plan features */}
        <ul className="mt-4 grid gap-2 rounded-2xl border border-border bg-input/40 p-4 sm:grid-cols-2">
          {selectedPlan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <FiCheck
                className="shrink-0 text-emerald-500 dark:text-emerald-300"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="mt-7 space-y-3">
        <Button
          fullWidth
          size="lg"
          onClick={handleContinue}
          isLoading={submitting}
          disabled={isLoading}
        >
          {selectedPlan.apiPlanId === "FREE"
            ? `Continue with the ${selectedPlan.name} plan`
            : `Pay ${selectedPlan.price} now · 30 days`}{" "}
          <FiArrowRight aria-hidden="true" />
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={() =>
              navigate(`/dashboard/onboarding/${slug}/details`, {
                replace: true,
              })
            }
            disabled={submitting}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip for now — decide later
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}

function PlanOption({
  plan,
  isSelected,
  onSelect,
  disabled,
}: {
  plan: Plan;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      disabled={disabled}
      className={`relative flex flex-col rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? "border-indigo-400/70 bg-indigo-500/[0.06] ring-2 ring-indigo-500/30"
          : "border-border bg-input/40 hover:border-indigo-400/40"
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
          Popular
        </span>
      )}
      <span className="font-display text-sm font-semibold text-foreground">
        {plan.name}
      </span>
      <span className="mt-1">
        <span className="font-display text-xl font-bold text-foreground">
          {plan.price}
        </span>{" "}
        <span className="text-xs text-muted-foreground">{plan.period}</span>
      </span>
      <span className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {plan.tagline}
      </span>
    </button>
  );
}

export default OnboardingPaymentPage;
