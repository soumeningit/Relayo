import { useNavigate } from "react-router-dom";
import { useTenant } from "../../contexts/TenantContext";
import { Button, Card } from "../ui";

function OrganizationSection() {
  const { tenant } = useTenant();
  const navigate = useNavigate();

  if (!tenant) return null;

  return (
    <Card hover className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-foreground">
            Organization
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {tenant.name} ·{" "}
            <code className="font-mono text-xs">{tenant.id}</code> ·{" "}
            {tenant.status.toLowerCase()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rename, contact details, custom fields and members are now managed
            on the organization page.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/dashboard/organization")}>
          Manage organization
        </Button>
      </div>
    </Card>
  );
}

export default OrganizationSection;
