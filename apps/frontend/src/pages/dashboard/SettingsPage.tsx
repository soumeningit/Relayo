import { FiKey } from "react-icons/fi";

import OrganizationSection from "../../components/setting/OrganizationSection";
import SecuritySection from "../../components/setting/SecuritySection";
import TeamSection from "../../components/setting/TeamSection";
import BillingSection from "../../components/setting/BillingSection";

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Settings
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Organization details, credentials and security.
      </p>

      <div className="mt-6 space-y-6">
        <OrganizationSection />
        <TeamSection />
        <BillingSection />
        <SecuritySection />
      </div>

      <p className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <FiKey aria-hidden="true" /> Keys are hashed at rest — the dashboard can
        never display a full key twice.
      </p>
    </div>
  );
}

export default SettingsPage;
