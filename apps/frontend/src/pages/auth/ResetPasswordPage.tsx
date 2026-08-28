import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { OtpInput } from "../../components/ui/OtpInput";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { resetPassword } from "../../api/services/AuthService";
import { validatePassword } from "../../lib/validation";

function ResetPasswordPage() {
  useDocumentMeta({
    title: "Set a new password",
    description:
      "Choose a new password for your Relayo account. Add your MFA code if two-factor authentication is enabled.",
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaOtp, setMfaOtp] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    token?: string;
  }>({});
  const [success, setSuccess] = useState(false);
  const { isLoading, run } = useApiCall();

  if (!token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This link is missing its security token. Request a fresh one."
      >
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6 text-center">
          <FiAlertCircle
            className="mx-auto text-red-500"
            size={40}
            aria-hidden="true"
          />
        </div>
        <Link to="/forgot-password" className="mt-5 block">
          <Button variant="outline" fullWidth>
            Request a new link
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = {
      password: validatePassword(password),
      confirmPassword:
        confirmPassword !== password ? "Passwords do not match" : undefined,
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const response = await run(
      () =>
        resetPassword({
          token,
          password,
          confirmPassword,
          mfaOtp: mfaEnabled ? mfaOtp : undefined,
        }),
      { showErrorToast: false },
    );

    if (!response) return;
    setSuccess(true);
    setTimeout(() => navigate("/signin", { replace: true }), 1800);
  };

  if (success) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your password has been changed successfully. Redirecting you to sign in…"
      >
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
          <FiCheckCircle
            className="mx-auto text-emerald-500"
            size={44}
            aria-hidden="true"
          />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle={
        mfaEnabled
          ? "Enter your new password and current MFA code to finish."
          : "Choose a strong password you haven't used elsewhere."
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <PasswordInput
          label="New password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          value={password}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setPassword(event.target.value)
          }
          error={errors.password}
          disabled={isLoading}
        />
        <PasswordInput
          label="Confirm new password"
          placeholder="Repeat your new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setConfirmPassword(event.target.value)
          }
          error={errors.confirmPassword}
          disabled={isLoading}
        />

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={mfaEnabled}
            onChange={(event) => {
              setMfaEnabled(event.target.checked);
              if (!event.target.checked) setMfaOtp("");
            }}
            className="h-4 w-4 rounded border-border accent-indigo-500"
            disabled={isLoading}
          />
          I have two-factor authentication enabled
        </label>

        {mfaEnabled && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              MFA code from your authenticator app
            </p>
            <OtpInput value={mfaOtp} onChange={setMfaOtp} autoFocus={false} />
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={mfaEnabled && mfaOtp.length !== 6}
        >
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
