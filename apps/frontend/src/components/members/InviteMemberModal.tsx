import { useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiMail,
  FiUserCheck,
} from "react-icons/fi";
import { toast } from "sonner";
import { inviteMember, lookupInvitee } from "../../api/services/OrgService";
import type { MemberRole } from "../../types/org";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { RoleBadge } from "./MemberBadges";

const ROLE_OPTIONS: {
  value: Exclude<MemberRole, "OWNER">;
  label: string;
  hint: string;
}[] = [
  { value: "MEMBER", label: "Member", hint: "Send events and view logs" },
  { value: "ADMIN", label: "Admin", hint: "Manage destinations and members" },
  { value: "VIEWER", label: "Viewer", hint: "Read-only access" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  /** Organization identifier (slug or ORG-… id) the member is invited to. */
  orgIdentifier: string;
  onSent: (info: { email: string; role: MemberRole; isRegistered: boolean }) => void;
}

export default function InviteMemberModal({
  open,
  onClose,
  orgIdentifier,
  onSent,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<MemberRole, "OWNER">>("MEMBER");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const trimmed = email.trim();
  const relayoUser = registeredName !== null;

  const reset = () => {
    setEmail("");
    setRole("MEMBER");
    setStep("form");
    setEmailError(undefined);
    setRegisteredName(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleContinue = async () => {
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(undefined);
    setChecking(true);
    try {
      const result = await lookupInvitee(orgIdentifier, trimmed);
      setRegisteredName(result.isRegistered ? result.name : null);
      setStep("confirm");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not check this email",
      );
    } finally {
      setChecking(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await inviteMember(orgIdentifier, {
        email: trimmed,
        role,
      });
      reset();
      onSent({ email: trimmed, role, isRegistered: result.isRegistered });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not send the invitation",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invite a member"
      description="Add a teammate to your organization in seconds."
    >
      {step === "form" ? (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleContinue();
          }}
        >
          <Input
            label="Email address"
            type="email"
            placeholder="teammate@company.com"
            value={email}
            autoFocus
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError(undefined);
            }}
            error={emailError}
          />

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Give them a role
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {ROLE_OPTIONS.map((option) => {
                const selected = option.value === role;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    aria-pressed={selected}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-indigo-500 bg-indigo-500/10 shadow-sm"
                        : "border-border bg-card hover:border-indigo-400/50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Already on Relayo? The invite arrives as an in-app notification they
            can accept or reject. Everyone else gets an invitation email.
          </p>

          <div className="flex justify-end">
            <Button type="submit" isLoading={checking}>
              Continue
              {!checking && <FiArrowRight aria-hidden="true" />}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          {relayoUser ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/12 text-emerald-600">
                <FiUserCheck aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {registeredName ?? trimmed} is already on Relayo
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  No invite email needed — we&apos;ll notify{" "}
                  {registeredName ?? "them"} in-app. They can accept or reject
                  the invitation from their notifications.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/8 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500/12 text-sky-600">
                <FiMail aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  No Relayo account yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  An invitation email will be sent to{" "}
                  <code className="font-mono">{trimmed}</code> with a join link
                  so they can create an account and accept.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              To
            </span>
            <span className="text-sm font-medium text-foreground">
              {trimmed}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <RoleBadge role={role} />
          </div>

          <div className="flex justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep("form")}
              disabled={sending}
            >
              <FiArrowLeft aria-hidden="true" /> Back
            </Button>
            <Button onClick={() => void handleSend()} isLoading={sending}>
              {relayoUser ? "Send notification" : "Send invite email"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}