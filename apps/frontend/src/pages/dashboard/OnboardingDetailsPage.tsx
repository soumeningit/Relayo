import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiFastForward,
  FiFileText,
} from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { OnboardingShell } from "../../components/layout/OnboardingShell";
import { PageLoader } from "../../components/ui/Spinner";
import { MetadataBuilder } from "../../components/dashboard/MetadataBuilder";
import {
  metadataToRows,
  rowsToMetadata,
  type MetadataRow,
} from "../../lib/metadata";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import {
  getOrganization,
  submitOrganizationDetails,
} from "../../api/services/OrgService";
import { useTenant } from "../../contexts/TenantContext";

function OnboardingDetailsPage() {
  useDocumentMeta({
    title: "Organization details",
    description: "Add contact details to finish setting up your Relayo tenant.",
  });

  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant, isLoading: tenantLoading, setTenant } = useTenant();

  const [form, setForm] = useState({
    description: "",
    website: "",
    address: "",
    phone: "",
  });
  const [metaRows, setMetaRows] = useState<MetadataRow[]>([]);
  const [errors, setErrors] = useState<{
    website?: string;
    metaKeys?: string;
  }>({});
  const [orgNotFound, setOrgNotFound] = useState(false);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const { isLoading: submitting, run } = useApiCall();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    // Prefill from server — setState inside promise callbacks
    getOrganization(slug)
      .then((org) => {
        if (cancelled) return;
        setForm({
          description: org.details?.description ?? "",
          website: org.details?.website ?? "",
          address: org.details?.address ?? "",
          phone: org.details?.phoneNumber ?? "",
        });
        setMetaRows(metadataToRows(org.details?.metadata));
      })
      .catch(() => !cancelled && setOrgNotFound(true))
      .finally(() => !cancelled && setIsLoadingOrg(false));

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (tenantLoading || isLoadingOrg) return <PageLoader />;

  // No tenant yet → start at step 1; payment (step 2) not done yet → pay
  if (!tenant) return <Navigate to="/dashboard/onboarding" replace />;
  if (tenant.completedSteps < 2) {
    return <Navigate to={`/dashboard/onboarding/${tenant.slug}/pay`} replace />;
  }

  // Slug in the URL must match the tenant we resumed
  if (orgNotFound || (!isLoadingOrg && tenant.slug !== slug)) {
    return <Navigate to={`/dashboard/onboarding/${tenant.slug}`} replace />;
  }

  const setField =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const goNext = () => navigate("/dashboard", { replace: true });

  const buildMetaData = (): Record<string, unknown> | undefined => {
    for (const row of metaRows) {
      if ((row.key.trim() || row.value.trim()) && !row.key.trim()) {
        setErrors((prev) => ({
          ...prev,
          metaKeys: "Every custom field needs a name.",
        }));
        return undefined;
      }
    }

    const keys = metaRows
      .filter((row) => row.key.trim() || row.value.trim())
      .map((row) => row.key.trim());
    if (new Set(keys).size !== keys.length) {
      setErrors((prev) => ({
        ...prev,
        metaKeys: "Custom field names must be unique.",
      }));
      return undefined;
    }

    setErrors((prev) => ({ ...prev, metaKeys: undefined }));
    return rowsToMetadata(metaRows);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const website = form.website.trim();
    if (website && !/^https?:\/\/.+\..+/.test(website)) {
      setErrors({ website: "Website must be a valid URL (https://…)" });
      return;
    }
    setErrors({});

    const metaData = buildMetaData();
    if (metaData === undefined) return;

    const response = await run(() =>
      submitOrganizationDetails(tenant.slug, {
        description: form.description,
        website,
        address: form.address,
        phone: form.phone,
        metaData,
      }),
    );
    if (!response) return;

    await setTenant({
      ...tenant,
      status: "ACTIVE",
      completedSteps: Math.max(tenant.completedSteps, 2),
    });
    goNext();
  };

  return (
    <OnboardingShell currentStep={3} wide>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
        <FiFileText size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]">
        Tell us about {tenant.name}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm leading-relaxed text-muted-foreground">
        Everything here is optional — add context now or anytime later.
        <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground">
          /{tenant.slug}
        </code>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-7">
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
          {/* Description — full width */}
          <div className="sm:col-span-2">
            <Input
              label={
                <span>
                  Description{" "}
                  <span className="font-normal text-muted-foreground/70">
                    (optional)
                  </span>
                </span>
              }
              type="text"
              placeholder="What does your organization do?"
              value={form.description}
              onChange={setField("description")}
              disabled={submitting}
            />
          </div>

          {/* Website */}
          <Input
            label={
              <span>
                Website{" "}
                <span className="font-normal text-muted-foreground/70">
                  (optional)
                </span>
              </span>
            }
            type="url"
            placeholder="https://acmecorp.com"
            value={form.website}
            onChange={setField("website")}
            error={errors.website}
            disabled={submitting}
          />

          {/* Phone */}
          <Input
            label={
              <span>
                Phone{" "}
                <span className="font-normal text-muted-foreground/70">
                  (optional)
                </span>
              </span>
            }
            type="tel"
            placeholder="+1 555 000 1234"
            autoComplete="tel"
            value={form.phone}
            onChange={setField("phone")}
            disabled={submitting}
          />

          {/* Address — full width */}
          <div className="sm:col-span-2">
            <Input
              label={
                <span>
                  Address{" "}
                  <span className="font-normal text-muted-foreground/70">
                    (optional)
                  </span>
                </span>
              }
              type="text"
              placeholder="Street, city, country"
              value={form.address}
              onChange={setField("address")}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="mt-6">
          <MetadataBuilder
            rows={metaRows}
            onChange={(rows) => {
              setMetaRows(rows);
              if (errors.metaKeys)
                setErrors((prev) => ({ ...prev, metaKeys: undefined }));
            }}
            error={errors.metaKeys}
            disabled={submitting}
          />
        </div>

        <div className="mt-7 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate(`/dashboard/onboarding/${tenant.slug}/pay`, { replace: true })
            }
            disabled={submitting}
          >
            <FiArrowLeft aria-hidden="true" /> Back
          </Button>
          <Button type="submit" fullWidth isLoading={submitting}>
            Save & continue <FiArrowRight aria-hidden="true" />
          </Button>
        </div>
      </form>

      {/* Never insist on details — straight to payment */}
      <div className="mt-6 border-t border-border pt-4">
        <button
          type="button"
          onClick={goNext}
          disabled={submitting}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <FiFastForward aria-hidden="true" />
          Skip for now
        </button>
      </div>
    </OnboardingShell>
  );
}

export default OnboardingDetailsPage;
