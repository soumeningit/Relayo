import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiMail } from "react-icons/fi";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { buttonClasses } from "../../components/ui/buttonStyles";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { registerUser } from "../../api/services/AuthService";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "../../lib/validation";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function SignupPage() {
  useDocumentMeta({
    title: "Create your account",
    description:
      "Sign up for Relayo and start delivering webhooks with guaranteed retries, HMAC signing and full delivery visibility.",
  });

const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("inviteToken");
  const invitedEmail = searchParams.get("email");

  const [form, setForm] = useState({
    name: "",
    email: invitedEmail ?? "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [verificationLink, setVerificationLink] = useState<string | null>(
    null,
  );
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const { isLoading, run } = useApiCall();

  const isInviteSignup = Boolean(inviteToken);

  const setField =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: FormErrors = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword:
        form.confirmPassword !== form.password
          ? "Passwords do not match"
          : undefined,
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const response = await run(() =>
      registerUser({
        ...form,
        registrationToken: inviteToken ?? undefined,
      }),
    );
    if (response) {
      if (response.verificationLink) {
        setVerificationLink(response.verificationLink);
      } else {
        setCreatedMessage(
          response.message ||
            "Account created successfully. You can sign in now.",
        );
      }
    }
  };

  if (createdMessage) {
    return (
      <AuthLayout
        title="Account created"
        subtitle="Your invitation is complete — sign in to get started."
      >
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
          <FiCheckCircle
            className="mx-auto text-emerald-500"
            size={44}
            aria-hidden="true"
          />
          <p className="mt-4 text-sm font-medium text-foreground">
            {createdMessage}
          </p>
        </div>

        <Link
          to="/signin"
          className={buttonClasses("outline", "md", true) + " mt-5"}
        >
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  if (verificationLink) {
    return (
      <AuthLayout
        title="Almost there — verify your email"
        subtitle="We sent a verification link to your inbox. It expires in 60 minutes."
      >
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
          <FiCheckCircle
            className="mx-auto text-emerald-500"
            size={44}
            aria-hidden="true"
          />
          <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
            <FiMail aria-hidden="true" /> Check {form.email}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Click the link in the email to verify your address
            {verificationLink && (
              <>
                {" "}
                — or{" "}
                <a
                  href={verificationLink}
                  className="font-medium text-indigo-500 underline-offset-2 hover:underline dark:text-indigo-300"
                >
                  verify now
                </a>
              </>
            )}
            .
          </p>
        </div>

        <Link
          to="/signin"
          className={buttonClasses("outline", "md", true) + " mt-5"}
        >
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

return (
    <AuthLayout
      title="Create your Relayo account"
      subtitle={
        isInviteSignup
          ? "You've been invited to an organization — finish signing up to join it."
          : "Set up a tenant, register destinations and deliver your first webhook in minutes."
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {isInviteSignup && invitedEmail && (
          <div className="flex items-start gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.06] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <FiMail className="mt-0.5 shrink-0 text-indigo-500" aria-hidden="true" />
            <span>
              Invited as <code className="font-mono">{invitedEmail}</code> —
              your account will activate once you create it.
            </span>
          </div>
        )}
        <Input
          label="Full name"
          type="text"
          placeholder="Ada Lovelace"
          autoComplete="name"
          value={form.name}
          onChange={setField("name")}
          error={errors.name}
          disabled={isLoading}
        />
        <Input
          label="Work email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={form.email}
          onChange={setField("email")}
          error={errors.email}
          disabled={isLoading}
        />
        <PasswordInput
          label="Password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
          disabled={isLoading}
        />
        <PasswordInput
          label="Confirm password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={setField("confirmPassword")}
          error={errors.confirmPassword}
          disabled={isLoading}
        />

        <Button type="submit" fullWidth isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/signin"
          className="inline-flex items-center gap-1 font-medium text-indigo-500 hover:underline dark:text-indigo-300"
        >
          Sign in <FiArrowLeft className="rotate-180" aria-hidden="true" />
        </Link>
      </p>
    </AuthLayout>
  );
}

export default SignupPage;
