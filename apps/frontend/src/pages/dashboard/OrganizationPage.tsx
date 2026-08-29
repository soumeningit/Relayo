import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  FiAlertCircle,
  FiBriefcase,
  FiCheck,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { CopyButton } from "../../components/ui/CopyButton";
import { Input } from "../../components/ui/Input";
import { PageLoader } from "../../components/ui/Spinner";
import {
  EmptyState,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
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
  updateOrganization,
} from "../../api/services/OrgService";
import { useTenant } from "../../contexts/TenantContext";
import type { OrgFull } from "../../types/org";

function statusTone(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "danger" as const;
}

function OrganizationPage() {
  useDocumentMeta({
    title: "Organization",
    description: "View and manage your Relayo organization details.",
  });

  const { tenant, setTenant, refresh } = useTenant();
  const [org, setOrg] = useState<OrgFull | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Identity form
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [identityErrors, setIdentityErrors] = useState<{
    name?: string;
    contactEmail?: string;
  }>({});

  // Details form
  const [detailsForm, setDetailsForm] = useState({
    description: "",
    website: "",
    address: "",
    phone: "",
  });
  const [metaRows, setMetaRows] = useState<MetadataRow[]>([]);
  const [detailsErrors, setDetailsErrors] = useState<{
    website?: string;
    metaKeys?: string;
  }>({});

  const { isLoading: loadingOrg, run } = useApiCall();

  const hydrate = useCallback((data: OrgFull) => {
    setOrg(data);
    setName(data.name);
    setContactEmail(data.contactEmail ?? "");
    setDetailsForm({
      description: data.details?.description ?? "",
      website: data.details?.website ?? "",
      address: data.details?.address ?? "",
      phone: data.details?.phoneNumber ?? "",
    });
    setMetaRows(metadataToRows(data.details?.metadata));
  }, []);

  const load = useCallback(
    () =>
      run(() => getOrganization(tenant?.id ?? tenant?.slug ?? ""), {
        showErrorToast: false,
      }).then((data) => {
        if (!data) {
          setLoadError(true);
          return;
        }
        setLoadError(false);
        hydrate(data);
      }),
    [tenant, run, hydrate],
  );

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    load().catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [tenant, load]);

  if (!tenant) {
    return (
      <EmptyState
        icon={<FiBriefcase />}
        title="No organization yet"
        action={
          <Link
            to="/dashboard/onboarding"
            className="text-sm font-medium text-indigo-500 hover:underline dark:text-indigo-300"
          >
            Create one now →
          </Link>
        }
      />
    );
  }

  if (loadingOrg && !org) return <PageLoader />;

  if (loadError || !org) {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title="Couldn't load your organization"
        description="Check your connection and try again."
        action={
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <FiRefreshCw aria-hidden="true" /> Retry
          </Button>
        }
      />
    );
  }

  /* ---------- Identity save ---------- */
  const handleIdentitySave = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors: typeof identityErrors = {};
    if (name.trim() !== org.name) {
      if (name.trim().length < 2)
        nextErrors.name = "Name must be at least 2 characters";
    }
    if (
      contactEmail.trim() &&
      contactEmail.trim() !== org.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
    ) {
      nextErrors.contactEmail = "Enter a valid email address";
    }
    if (Object.values(nextErrors).some(Boolean)) {
      setIdentityErrors(nextErrors);
      return;
    }
    setIdentityErrors({});

    const payload: Record<string, string> = {};
    if (name.trim() !== org.name) payload.name = name.trim();
    if (contactEmail.trim() !== (org.contactEmail ?? ""))
      payload.contactEmail = contactEmail.trim();

    if (Object.keys(payload).length === 0) return;

    const response = await run(() => updateOrganization(tenant.id, payload));
    if (!response) return;

    setOrg({ ...org, ...response.data });
    await refresh(); // sync TenantContext (name/slug/status)
    toast.success("Organization updated");
  };

  /* ---------- Details save ---------- */
  const validateWebsite = (website: string) =>
    website && !/^https?:\/\/.+\..+/.test(website)
      ? "Website must be a valid URL (https://…)"
      : undefined;

  const buildMetaData = (): Record<string, unknown> | undefined => {
    const filled = metaRows.filter((row) => row.key.trim() || row.value.trim());

    for (const row of filled) {
      if (!row.key.trim()) {
        setDetailsErrors((prev) => ({
          ...prev,
          metaKeys: "Every custom field needs a name.",
        }));
        return undefined;
      }
    }

    const keys = filled.map((row) => row.key.trim());
    if (new Set(keys).size !== keys.length) {
      setDetailsErrors((prev) => ({
        ...prev,
        metaKeys: "Custom field names must be unique.",
      }));
      return undefined;
    }

    setDetailsErrors((prev) => ({ ...prev, metaKeys: undefined }));
    return rowsToMetadata(filled);
  };

  const handleDetailsSave = async (event: FormEvent) => {
    event.preventDefault();

    const website = detailsForm.website.trim();
    const websiteError = validateWebsite(website);
    if (websiteError) {
      setDetailsErrors({ website: websiteError });
      return;
    }
    setDetailsErrors({});

    const metaData = buildMetaData();
    if (metaData === undefined) return;

    const response = await run(() =>
      submitOrganizationDetails(tenant.slug, {
        description: detailsForm.description,
        website,
        address: detailsForm.address,
        phone: detailsForm.phone,
        metaData,
      }),
    );
    if (!response) return;

    if (tenant.completedSteps < 2) {
      setTenant({ ...tenant, status: "ACTIVE", completedSteps: 2 });
    }
    await load();
    toast.success("Organization details saved");
  };

  const identityDirty =
    name !== org.name || contactEmail !== (org.contactEmail ?? "");

  return (
    <div className="mx-auto max-w-3xl">
      {/* ---------- Identity header card ---------- */}
      <Card className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start gap-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 font-display text-xl font-bold text-white shadow-lg shadow-indigo-500/30">
            {org.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground">
                {org.name}
              </h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  statusTone(org.status) === "success"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : statusTone(org.status) === "warning"
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      : "border-red-500/25 bg-red-500/10 text-red-500 dark:text-red-300"
                }`}
              >
                {org.status.toLowerCase()}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/6 py-1 pl-2.5 pr-1">
                <code className="font-mono text-xs font-medium text-foreground">
                  {org.organizationId}
                </code>
                <CopyButton
                  value={org.organizationId}
                  label="Organization ID"
                />
              </span>
              <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                /{org.slug}
              </code>
              {org.completedSteps >= 2 ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300">
                  <FiCheck aria-hidden="true" /> onboarding complete
                </span>
              ) : (
                <Link
                  to={`/dashboard/onboarding/${org.slug}`}
                  className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
                >
                  Finish onboarding ({org.completedSteps}/2) →
                </Link>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ---------- Manage identity ---------- */}
      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <FiBriefcase aria-hidden="true" /> Basic information
        </h2>
        <form
          onSubmit={handleIdentitySave}
          noValidate
          className="mt-5 space-y-4"
        >
          <Input
            label={
              <span>
                Organization name{" "}
                <span className="font-normal text-muted-foreground/70">
                  (public)
                </span>
              </span>
            }
            type="text"
            value={name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setName(event.target.value);
              if (identityErrors.name)
                setIdentityErrors((p) => ({ ...p, name: undefined }));
            }}
            error={identityErrors.name}
            disabled={loadingOrg}
          />
          <Input
            label="Contact email"
            type="email"
            placeholder="ops@company.com"
            value={contactEmail}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setContactEmail(event.target.value);
              if (identityErrors.contactEmail)
                setIdentityErrors((p) => ({ ...p, contactEmail: undefined }));
            }}
            error={identityErrors.contactEmail}
            disabled={loadingOrg}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              isLoading={loadingOrg}
              disabled={!identityDirty}
            >
              Save basic info
            </Button>
          </div>
        </form>
      </Card>

      {/* ---------- Details + metadata ---------- */}
      <Card className="mt-6 p-6">
        <h2 className="font-display text-base font-semibold text-foreground">
          Details & custom fields
        </h2>
        <form onSubmit={handleDetailsSave} noValidate className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
                value={detailsForm.description}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDetailsForm((p) => ({
                    ...p,
                    description: event.target.value,
                  }))
                }
                disabled={loadingOrg}
              />
            </div>
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
              value={detailsForm.website}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setDetailsForm((p) => ({ ...p, website: event.target.value }))
              }
              error={detailsErrors.website}
              disabled={loadingOrg}
            />
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
              value={detailsForm.phone}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setDetailsForm((p) => ({ ...p, phone: event.target.value }))
              }
              disabled={loadingOrg}
            />
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
                value={detailsForm.address}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDetailsForm((p) => ({ ...p, address: event.target.value }))
                }
                disabled={loadingOrg}
              />
            </div>
          </div>

          <div className="mt-5">
            <MetadataBuilder
              rows={metaRows}
              onChange={(rows) => {
                setMetaRows(rows);
                if (detailsErrors.metaKeys)
                  setDetailsErrors((p) => ({ ...p, metaKeys: undefined }));
              }}
              error={detailsErrors.metaKeys}
              disabled={loadingOrg}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="submit" size="sm" isLoading={loadingOrg}>
              Save details
            </Button>
          </div>
        </form>
      </Card>

      {/* ---------- Members ---------- */}
      {org.members && org.members.length > 0 && (
        <>
          <div className="mb-3 mt-8 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-foreground">
              Members ({org.members.length})
            </h2>
            <Link
              to="/dashboard/members"
              className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
            >
              Manage members →
            </Link>
          </div>
          <TableWrapper>
            <THead>
              <TR>
                <TH>Member</TH>
                <TH>Email</TH>
                <TH>Role</TH>
              </TR>
            </THead>
            <tbody>
              {org.members.map((member) => (
                <TR key={`${member.role}-${member.user.userId}`}>
                  <TD>{member.user.name}</TD>
                  <TD className="font-mono text-xs">{member.user.email}</TD>
                  <TD>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        member.role === "OWNER"
                          ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {member.role.toLowerCase()}
                    </span>
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableWrapper>
        </>
      )}
    </div>
  );
}

export default OrganizationPage;
