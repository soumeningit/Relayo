import { Button } from "../ui";
import { FiZap } from "react-icons/fi";

export default function BillingSection() {
  // Mock Data based on your PaymentType enum
  const currentPlan = "FREE";
  const usagePercentage = 45; // Mock usage for the month

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-base font-semibold text-foreground">
        Billing & Usage
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your subscription and view current usage limits.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-input/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
            <FiZap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Current Plan: <span className="font-bold">{currentPlan}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              1,000 events / month limit
            </p>
          </div>
        </div>
        <Button size="sm">Upgrade Plan</Button>
      </div>

      {/* Simple visual usage bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Events used this month</span>
          <span>450 / 1,000</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
