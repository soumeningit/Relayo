import { useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiHelpCircle,
  FiZap,
} from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { CopyButton } from "../../components/ui/CopyButton";
import { Input } from "../../components/ui/Input";
import { OnboardingShell } from "../../components/layout/OnboardingShell";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { validateEmail, validateName } from "../../lib/validation";
import { slugify } from "../../lib/time";
import { createOrg, getOrganization } from "../../api/services/OrgService";
import { useTenant } from "../../contexts/TenantContext";

function OnboardingPage() {
  useDocumentMeta({
    title: "Create your organization",
    description: "Set up your Relayo tenant to start delivering webhooks.",
  });

  const navigate = useNavigate();
  const { tenant, isLoading, setTenant } = useTenant();
  const [form, setForm] = useState({ name: "", orgEmail: "" });
  const [errors, setErrors] = useState<{ name?: string; orgEmail?: string }>(
    {},
  );
  const [createdOrg, setCreatedOrg] = useState<{
    id: string;
    slug: string;
    name: string;
  } | null>(null);

  // Resume-by-id
  const [showResume, setShowResume] = useState(false);
  const [resumeId, setResumeId] = useState("");

  const { isLoading: submitting, run } = useApiCall();

  if (!isLoading && tenant) {
    return <Navigate to="/dashboard" replace />;
  }

  const setField =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = {
      name: validateName(form.name),
      orgEmail: validateEmail(form.orgEmail),
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    // Idempotent on the server — returns the existing owned org if present
    const response = await run(() =>
      createOrg({ name: form.name.trim(), orgEmail: form.orgEmail.trim() }),
    );
    if (!response) return;

    setTenant({
      id: response.data.id,
      name: response.data.name,
      slug: response.data.slug,
      status: "PENDING",
      completedSteps: 1,
    });
    setCreatedOrg(response.data);
  };

  const handleResumeFetch = async () => {
    const identifier = resumeId.trim();
    if (!identifier) return;

    const org = await run(() => getOrganization(identifier), {
      showErrorToast: false,
    });
    if (!org) return;

    setTenant({
      id: org.organizationId,
      name: org.name,
      slug: org.slug,
      status: org.status,
      completedSteps: org.completedSteps,
    });

    // navigate(
    //   org.completedSteps >= 2
    //     ? "/dashboard"
    //     : `/dashboard/onboarding/${org.slug}`,
    //   { replace: true },
    // );
  };

  /* ---- Post-create success state: show the public org id once ---- */
  if (createdOrg) {
    return (
      <OnboardingShell currentStep={1}>
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-500 dark:text-emerald-300">
            <FiCheckCircle size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
            Organization created
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">
              {createdOrg.name}
            </strong>{" "}
            is ready. This is your public organization ID — copy it somewhere
            safe.
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-indigo-500/25 bg-indigo-500/6 p-4">
            <code className="min-w-0 flex-1 break-all text-left font-mono text-sm font-medium text-foreground">
              {createdOrg.id}
            </code>
            <CopyButton value={createdOrg.id} label="Organization ID" />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            You'll find it anytime in Settings → Organization.
          </p>

          <Button
            fullWidth
            size="lg"
            className="mt-7"
            onClick={() =>
              navigate(`/dashboard/onboarding/${createdOrg.slug}`, {
                replace: true,
              })
            }
          >
            Continue to details <FiArrowRight aria-hidden="true" />
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell currentStep={1}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
        <FiZap size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]">
        Create your organization
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        One Relayo organization per account. Register destinations and send
        events under this tenant.
      </p>

      <form onSubmit={handleCreate} noValidate className="mt-7 space-y-5">
        <Input
          label="Organization name"
          type="text"
          placeholder="Acme Corp"
          autoComplete="organization"
          value={form.name}
          onChange={setField("name")}
          error={errors.name}
          hint={
            form.name.trim()
              ? `Slug preview · relayo.app/${slugify(form.name) || "…"}`
              : "Used to identify your tenant across the API"
          }
          disabled={submitting || isLoading}
          autoFocus
        />
        <Input
          label="Organization email"
          type="email"
          placeholder="ops@acmecorp.com"
          autoComplete="email"
          value={form.orgEmail}
          onChange={setField("orgEmail")}
          error={errors.orgEmail}
          disabled={submitting || isLoading}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={submitting}
          disabled={isLoading}
        >
          Create organization <FiArrowRight aria-hidden="true" />
        </Button>
      </form>

      {/* Resume flow */}
      <div className="mt-7 border-t border-border pt-5">
        {!showResume ? (
          <button
            type="button"
            onClick={() => setShowResume(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-500 transition-colors hover:text-indigo-400 dark:text-indigo-300"
          >
            <FiHelpCircle aria-hidden="true" />
            Already created an organization?
          </button>
        ) : (
          <div>
            <Input
              label="Organization ID or slug"
              placeholder="ORG-… or acme-corp-173"
              value={resumeId}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setResumeId(event.target.value)
              }
              disabled={submitting}
              hint="We'll fetch your data and pick up where you left off."
            />
            <div className="mt-3 flex gap-2.5">
              <Button
                onClick={handleResumeFetch}
                isLoading={submitting}
                disabled={!resumeId.trim()}
                size="sm"
              >
                Fetch my organization
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowResume(false);
                  setResumeId("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}

export default OnboardingPage;
