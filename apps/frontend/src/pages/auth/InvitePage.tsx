import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiCheckCircle,
  FiMail,
  FiShield,
  FiUserPlus,
  FiUserX,
  FiXCircle,
} from "react-icons/fi";
import {
  getInvitationDetails,
  respondInvite,
} from "../../api/services/InviteService";
import { RoleBadge } from "../../components/members/MemberBadges";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { buttonClasses } from "../../components/ui/buttonStyles";
import { PageLoader } from "../../components/ui";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { formatDate } from "../../lib/time";
import type { InvitationDetails } from "../../types/org";

type Phase = "loading" | "details" | "resolved" | "unavailable";

export default function InvitePage() {
  useDocumentMeta({
    title: "Invitation",
    description:
      "You've been invited to join an organization on Relayo — accept or decline.",
  });

  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [registrationToken, setRegistrationToken] = useState<string | null>(
    null,
  );
  const [inviteeEmail, setInviteeEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    getInvitationDetails(token)
      .then((data) => {
        if (!data.isValid) {
          setNotice(data.reason ?? "This invitation link is no longer valid.");
          setPhase("unavailable");
          return;
        }
        setDetails(data);
        setPhase("details");
      })
      .catch(() => {
        setNotice(
          "We couldn't load this invitation right now. Please try again.",
        );
        setPhase("unavailable");
      });
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRespond = async (response: "accept" | "decline") => {
    if (!token) return;
    setActionError(null);
    setBusy(true);
    try {
      const result = await respondInvite(token, response);
      setInviteeEmail(result.email);
      setRegistrationToken(result.registrationToken ?? null);
      setNotice(result.message);
      setPhase("resolved");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (phase === "loading") return <PageLoader />;

  if (phase === "unavailable" || !details) {
    return (
      <AuthLayout
        title="Invitation unavailable"
        subtitle="We couldn't find a valid invitation for this link."
      >
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-6 text-center">
          <FiXCircle
            className="mx-auto text-amber-500"
            size={44}
            aria-hidden="true"
          />
          <p className="mt-4 text-sm font-medium text-foreground">
            {notice ?? "This invitation link appears to be invalid."}
          </p>
        </div>

        <Link
          to="/"
          className={buttonClasses("outline", "md", true) + " mt-5"}
        >
          Back to home
        </Link>
      </AuthLayout>
    );
  }

  if (phase === "resolved") {
    const needsSignup = Boolean(registrationToken);
    const targetPath = needsSignup
      ? `/signup?inviteToken=${encodeURIComponent(
          registrationToken ?? "",
        )}&email=${encodeURIComponent(inviteeEmail ?? "")}`
      : "/signin";

    return (
      <AuthLayout
        title={needsSignup ? "Almost there" : "You're all set"}
        subtitle={notice ?? undefined}
      >
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
          <FiCheckCircle
            className="mx-auto text-emerald-500"
            size={44}
            aria-hidden="true"
          />
          {inviteeEmail && (
            <p className="mt-4 break-all text-sm font-medium text-foreground">
              {inviteeEmail}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {notice}
          </p>
        </div>

        <Link
          to={targetPath}
          className={buttonClasses("primary", "md", true) + " mt-5"}
        >
          {needsSignup ? "Create your account" : "Go to sign in"}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={`Join ${details.orgName}`}
      subtitle={`${details.inviterName} invited you to collaborate on this organization.`}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
              <FiShield aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {details.orgName}
              </p>
              <p className="text-xs text-muted-foreground">
                You&apos;ll be invited as {details.email}
              </p>
            </div>
            <RoleBadge role={details.role ?? "MEMBER"} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Invited by{" "}
              <span className="font-medium text-foreground">
                {details.inviterName}
              </span>
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:block" />
            <span>
              Invite expires {details.expiresAt ? formatDate(details.expiresAt) : "soon"}
            </span>
          </div>
        </div>

        {actionError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3 text-sm text-destructive">
            <FiXCircle className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() => void handleRespond("decline")}
            isLoading={busy}
          >
            <FiUserX aria-hidden="true" /> Decline
          </Button>
          <Button onClick={() => void handleRespond("accept")} isLoading={busy}>
            <FiUserPlus aria-hidden="true" /> Accept invitation
          </Button>
        </div>

        {details.isRegistered && (
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <FiMail aria-hidden="true" />
            Your account is already set up — just sign in after accepting.
          </p>
        )}
      </div>
    </AuthLayout>
  );
}