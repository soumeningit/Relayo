import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FiArrowRight, FiKey } from "react-icons/fi";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { OtpInput } from "../../components/ui/OtpInput";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { useAuth, type User } from "../../contexts/AuthContext";
import { loginUser, verifyMfa } from "../../api/services/AuthService";
import { validateEmail, validatePassword } from "../../lib/validation";

function finishSignIn(
  accessToken: string,
  login: (token: string, user: User) => void,
  navigate: ReturnType<typeof useNavigate>,
  fallbackEmail?: string,
) {
  const decoded = jwtDecode<{ id?: string; email?: string }>(accessToken);
  login(accessToken, {
    id: decoded.id ?? "",
    email: decoded.email ?? fallbackEmail ?? "",
  });
  navigate("/dashboard", { replace: true });
}

function SigninPage() {
  useDocumentMeta({
    title: "Sign in",
    description:
      "Sign in to your Relayo dashboard to manage destinations, inspect delivery logs and replay events.",
  });

  const navigate = useNavigate();
  const { login } = useAuth();
  const { isLoading, run } = useApiCall();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [mfaEmail, setMfaEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const setField =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));

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

    const response = await run(() => loginUser(form), { showErrorToast: false });
    if (!response) return;

    if (response.mfaVerificationRequired) {
      setMfaEmail(response.email);
      setOtp("");
      return;
    }

    if (response.accessToken) {
      finishSignIn(response.accessToken, login, navigate, response.email);
    }
  };

  const handleMfaSubmit = async () => {
    if (!mfaEmail || otp.length !== 6) return;

    const response = await run(() => verifyMfa({ email: mfaEmail, otp }), {
      showErrorToast: false,
    });
    if (!response) return;

    if (response.accessToken) {
      finishSignIn(response.accessToken, login, navigate, mfaEmail);
    }
  };

  if (mfaEmail) {
    return (
      <AuthLayout
        title="Two-factor authentication"
        subtitle={`Enter the 6-digit code from your authenticator app for ${mfaEmail}.`}
      >
        <div className="rounded-2xl border border-border bg-card p-6">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/12 text-indigo-500 dark:text-indigo-300">
            <FiKey size={20} aria-hidden="true" />
          </span>
          <div className="mt-5">
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
          </div>
          <Button
            fullWidth
            className="mt-6"
            isLoading={isLoading}
            disabled={otp.length !== 6}
            onClick={handleMfaSubmit}
          >
            Verify & sign in
          </Button>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Wrong account?{" "}
          <button
            type="button"
            onClick={() => {
              setMfaEmail(null);
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
      title="Welcome back"
      subtitle="Sign in to manage destinations and watch every delivery in real time."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
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
          placeholder="Your password"
          autoComplete="current-password"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
          disabled={isLoading}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          Sign in <FiArrowRight aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Relayo?{" "}
        <Link
          to="/signup"
          className="font-medium text-indigo-500 hover:underline dark:text-indigo-300"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default SigninPage;
