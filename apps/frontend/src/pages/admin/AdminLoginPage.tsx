import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiKey, FiShield } from "react-icons/fi";
import { toast } from "sonner";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { OtpInput } from "../../components/ui/OtpInput";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { useAdmin } from "../../contexts/AdminContext";
import {
  ADMIN_DEMO_EMAIL,
  ADMIN_DEMO_PASSWORD,
  adminLogin,
  adminResendMfaCode,
  adminVerifyMfa,
} from "../../api/services/adminMockService";
import { validateEmail, validatePassword } from "../../lib/validation";

function AdminLoginPage() {
  useDocumentMeta({
    title: "Admin sign in",
    description:
      "Restricted access — Relayo platform administration. MFA is required.",
  });

  const navigate = useNavigate();
  const { login } = useAdmin();
  const { isLoading, run } = useApiCall();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [mfaEmail, setMfaEmail] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const setField =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setFormError(null);
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const response = await run(() => adminLogin(form), {
      showErrorToast: false,
    });
    if (!response) {
      setFormError("Invalid email or password.");
      return;
    }

    if (response.mfaRequired) {
      setMfaEmail(response.email);
      setDemoOtp(response.otp ?? null);
      setOtp("");
      setFormError(null);
    }
  };

  const handleMfaSubmit = async () => {
    if (!mfaEmail || otp.length !== 6) return;

    const response = await run(() => adminVerifyMfa({ email: mfaEmail, otp }), {
      showErrorToast: false,
    });
    if (!response) {
      setFormError("Invalid verification code. Request a new one and retry.");
      return;
    }

    login(response.token, response.user);
    toast.success("Signed in to the admin console.");
    navigate("/admin/dashboard", { replace: true });
  };

  const handleResend = async () => {
    if (!mfaEmail) return;
    const code = await run(() => adminResendMfaCode(mfaEmail), {
      showErrorToast: false,
    });
    if (code) {
      setDemoOtp(code);
      setOtp("");
      setFormError(null);
      toast.success("A new verification code was generated.");
    }
  };

  if (mfaEmail) {
    return (
      <AuthLayout
        title="Two-factor authentication"
        subtitle={`Enter the 6-digit code sent to ${mfaEmail}.`}
      >
        <div className="rounded-2xl border border-border bg-card p-6">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/12 text-indigo-500 dark:text-indigo-300">
            <FiKey size={20} aria-hidden="true" />
          </span>
          <div className="mt-5">
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
          </div>
          {formError && (
            <p role="alert" className="mt-3 text-center text-xs text-red-500">
              {formError}
            </p>
          )}
          <Button
            fullWidth
            className="mt-6"
            isLoading={isLoading}
            disabled={otp.length !== 6}
            onClick={handleMfaSubmit}
          >
            Verify & sign in
          </Button>

          {demoOtp && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              Demo: your verification code is{" "}
              <span className="font-mono font-semibold">{demoOtp}</span>
            </p>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="text-xs font-medium text-indigo-500 hover:underline disabled:opacity-50 dark:text-indigo-300"
            >
              Resend code
            </button>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Wrong account?{" "}
          <button
            type="button"
            onClick={() => {
              setMfaEmail(null);
              setDemoOtp(null);
              setOtp("");
            }}
            className="font-medium text-indigo-500 hover:underline dark:text-indigo-300"
          >
            Back to sign in
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Relayo Admin"
      subtitle="Restricted access — platform administration. Multi-factor authentication is mandatory."
    >
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        <FiShield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
        <span>
          Demo credentials — email{" "}
          <span className="font-mono font-semibold text-foreground">
            {ADMIN_DEMO_EMAIL}
          </span>{" "}
          with password{" "}
          <span className="font-mono font-semibold text-foreground">
            {ADMIN_DEMO_PASSWORD}
          </span>
          .
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="admin@relayo.app"
          autoComplete="email"
          value={form.email}
          onChange={setField("email")}
          error={errors.email}
          disabled={isLoading}
        />
        <PasswordInput
          label="Password"
          placeholder="Your password"
          autoComplete="current-password"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
          disabled={isLoading}
        />

        <Button type="submit" fullWidth isLoading={isLoading}>
          Continue <FiArrowRight aria-hidden="true" />
        </Button>
      </form>

      {formError && (
        <p role="alert" className="mt-4 text-center text-xs text-red-500">
          {formError}
        </p>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        MFA is enforced on every admin sign-in. No self-service registration is
        available for this account.
      </p>
    </AuthLayout>
  );
}

export default AdminLoginPage;