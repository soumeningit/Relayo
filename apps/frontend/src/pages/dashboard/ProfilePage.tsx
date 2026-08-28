import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  FiBriefcase,
  FiCheck,
  FiCopy,
  FiMail,
  FiMapPin,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { CopyButton } from "../../components/ui/CopyButton";
import { EmptyState, Input, PageLoader } from "../../components/ui";
import { useApiCall } from "../../hooks/useApiCall";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import * as profileService from "../../api/services/ProfileService";
import { getOrganization } from "../../api/services/OrgService";
import type { OrgFull } from "../../types/org";
import type {
  Profile,
  ProfileAddressType,
} from "../../types/profile";

function PureAvatar({
  url,
  name,
}: {
  url: string | null;
  name: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md"
      />
    );
  }

  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 via-violet-500 to-cyan-400 font-display text-xl font-bold text-white shadow-md shadow-indigo-500/25">
      {(name.charAt(0) || "?").toUpperCase()}
    </span>
  );
}

interface AddressFormState {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

function emptyAddressForm(): AddressFormState {
  return { street: "", city: "", state: "", country: "", zipCode: "" };
}

function ProfilePage() {
  useDocumentMeta({
    title: "Profile",
    description: "Your personal details, addresses and organization.",
  });

  const { updateUser } = useAuth();
  const { tenant } = useTenant();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [addresses, setAddresses] = useState<Record<ProfileAddressType, AddressFormState>>({
    CURRENT: emptyAddressForm(),
    PERMANENT: emptyAddressForm(),
  });

  const [org, setOrg] = useState<OrgFull | null>(null);

  const { isLoading: loadingProfile, run } = useApiCall();
  const { isLoading: loadingOrg, run: runOrg } = useApiCall();

  useEffect(() => {
    let cancelled = false;
    run(() => profileService.getProfile(), { showErrorToast: false })
      .then((data) => {
        if (!data || cancelled) return;
        setProfile(data);
        setName(data.user.name);
        setBio(data.userProfile.bio ?? "");
        setAddresses({
          CURRENT: fromAddress(data.addresses, "CURRENT"),
          PERMANENT: fromAddress(data.addresses, "PERMANENT"),
        });
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [run]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    runOrg(() => getOrganization(tenant.id), { showErrorToast: false }).then(
      (data) => !cancelled && setOrg(data),
    );
    return () => {
      cancelled = true;
    };
  }, [tenant, runOrg]);

  if (loadError || (!loadingProfile && !profile)) {
    return (
      <EmptyState
        icon={<FiUser />}
        title="Couldn't load your profile"
        description="Check your connection and try again."
        action={
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <FiRefreshCw aria-hidden="true" /> Retry
          </Button>
        }
      />
    );
  }

  if (loadingProfile || !profile) return <PageLoader />;

  const profileDirty =
    name !== profile.user.name ||
    (bio ?? "") !== (profile.userProfile.bio ?? "") ||
    avatarFile !== null;

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault();

    const payload: { name?: string; bio?: string } = {};
    if (name !== profile.user.name) payload.name = name;
    if ((bio ?? "") !== (profile.userProfile.bio ?? "")) payload.bio = bio;

    if (Object.keys(payload).length === 0 && !avatarFile) return;

    const saved = await run(() =>
      profileService.updateProfile(payload, avatarFile ?? undefined),
    );
    if (!saved) return;

    setProfile((p) => (p ? { ...p, user: saved.user, userProfile: saved.userProfile } : p));
    if (saved.user.name !== profile.user.name) {
      updateUser({ name: saved.user.name });
    }
    setAvatarFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    toast.success("Profile updated");
  };

  const handleAddressSave = async (
    type: ProfileAddressType,
    event: FormEvent,
  ) => {
    event.preventDefault();
    const form = addresses[type];
    const saved = await run(() =>
      profileService.updateAddress({
        type,
        street: form.street || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        zipCode: form.zipCode || undefined,
      }),
    );
    if (!saved) return;
    setAddresses((p) => ({
      ...p,
      [type]: fromAddress([saved], type),
    }));
    toast.success(`${type.toLowerCase()} address saved`);
  };

  const setAddressField = (
    type: ProfileAddressType,
    field: keyof AddressFormState,
    value: string,
  ) => {
    setAddresses((p) => ({ ...p, [type]: { ...p[type], [field]: value } }));
  };

  const statusTone = (status: string) => {
    if (status === "ACTIVE") return "success";
    if (status === "PENDING") return "warning";
    return "danger";
  };

  const statusClass = (status: string) => {
    const tone = statusTone(status);
    if (tone === "success")
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    if (tone === "warning")
      return "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300";
    return "border-red-500/25 bg-red-500/10 text-red-500 dark:text-red-300";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Profile
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your personal details, address book and organization membership.
      </p>

      {/* ---------- Personal details + avatar ---------- */}
      <Card className="mt-6 p-6">
        <form onSubmit={handleProfileSave} noValidate>
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex flex-col items-center gap-2.5">
              <PureAvatar
                url={previewUrl ?? profile.userProfile.avatarUrl}
                name={profile.user.name}
              />
              <span className="relative">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Change photo
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <Input
                label="Full name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ada Lovelace"
                disabled={loadingProfile}
              />
              <div>
                <label
                  htmlFor="profile-bio"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Bio
                  <span className="font-normal text-muted-foreground/70">
                    {" "}
                    (optional)
                  </span>
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="A short line about you."
                  disabled={loadingProfile}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FiMail aria-hidden="true" /> {profile.user.email}
                </span>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={loadingProfile}
                  disabled={!profileDirty}
                >
                  Save details
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>

      {/* ---------- Address ---------- */}
      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <FiMapPin aria-hidden="true" /> Address
        </h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {(Object.keys(addresses) as ProfileAddressType[]).map((type) => (
            <form
              key={type}
              onSubmit={(event) => handleAddressSave(type, event)}
              noValidate
              className="rounded-xl border border-border bg-card/40 p-4"
            >
              <h3 className="text-sm font-medium text-muted-foreground">
                {type.toLowerCase()}
              </h3>
              <div className="mt-3 space-y-3">
                <Input
                  label="Street"
                  type="text"
                  value={addresses[type].street}
                  onChange={(event) =>
                    setAddressField(type, "street", event.target.value)
                  }
                  disabled={loadingProfile}
                />
                <Input
                  label="City"
                  type="text"
                  value={addresses[type].city}
                  onChange={(event) =>
                    setAddressField(type, "city", event.target.value)
                  }
                  disabled={loadingProfile}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="State"
                    type="text"
                    value={addresses[type].state}
                    onChange={(event) =>
                      setAddressField(type, "state", event.target.value)
                    }
                    disabled={loadingProfile}
                  />
                  <Input
                    label="ZIP"
                    type="text"
                    value={addresses[type].zipCode}
                    onChange={(event) =>
                      setAddressField(type, "zipCode", event.target.value)
                    }
                    disabled={loadingProfile}
                  />
                </div>
                <Input
                  label="Country"
                  type="text"
                  value={addresses[type].country}
                  onChange={(event) =>
                    setAddressField(type, "country", event.target.value)
                  }
                  disabled={loadingProfile}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="submit" size="sm" isLoading={loadingProfile}>
                  Save
                </Button>
              </div>
            </form>
          ))}
        </div>
      </Card>

      {/* ---------- Organization membership ---------- */}
      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <FiBriefcase aria-hidden="true" /> Organization
        </h2>

        {!tenant ? (
          <EmptyState
            icon={<FiBriefcase />}
            title="You're not part of an organization yet"
            description="Create or join one to start delivering webhooks."
            action={
              <Link
                to="/dashboard/onboarding"
                className="text-sm font-medium text-indigo-500 hover:underline dark:text-indigo-300"
              >
                Create one now →
              </Link>
            }
          />
        ) : loadingOrg && !org ? (
          <PageLoader />
        ) : !org ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 font-display text-lg font-bold text-white">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {tenant.name}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusClass(
                      tenant.status,
                    )}`}
                  >
                    {tenant.status.toLowerCase()}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 font-display text-xl font-bold text-white shadow-lg shadow-indigo-500/30">
                {org.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="truncate font-display text-lg font-bold text-foreground">
                    {org.name}
                  </h3>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusClass(
                      org.status,
                    )}`}
                  >
                    {org.status.toLowerCase()}
                  </span>
                  {org.completedSteps >= 2 && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300">
                      <FiCheck aria-hidden="true" /> onboarding complete
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="flex items-center gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/6 py-1 pl-2.5 pr-1">
                    <code className="font-mono text-xs font-medium text-foreground">
                      {org.organizationId}
                    </code>
                    <CopyButton value={org.organizationId} label="Organization ID" />
                  </span>
                  <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    /{org.slug}
                  </code>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FiCopy aria-hidden="true" /> Member since{" "}
                    {new Date(org.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {(org.details?.description ||
              org.details?.website ||
              org.details?.phoneNumber ||
              org.details?.address) && (
              <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-xl border border-border bg-card/40 p-4 text-sm sm:grid-cols-2">
                {org.details?.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      About
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {org.details.description}
                    </dd>
                  </div>
                )}
                {org.details?.website && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Website
                    </dt>
                    <dd className="mt-1 truncate text-indigo-500 dark:text-indigo-300">
                      {org.details.website}
                    </dd>
                  </div>
                )}
                {org.details?.phoneNumber && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Phone
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {org.details.phoneNumber}
                    </dd>
                  </div>
                )}
                {org.details?.address && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Address
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {org.details.address}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <div className="mt-5">
              <Link
                to="/dashboard/organization"
                className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
              >
                Manage organization →
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function fromAddress(
  addresses: { type: ProfileAddressType; street: string | null; city: string | null; state: string; country: string; zipCode: string }[],
  type: ProfileAddressType,
): AddressFormState {
  const found = addresses.find((a) => a.type === type);
  if (!found) return emptyAddressForm();
  return {
    street: found.street ?? "",
    city: found.city ?? "",
    state: found.state ?? "",
    country: found.country ?? "",
    zipCode: found.zipCode ?? "",
  };
}

export default ProfilePage;