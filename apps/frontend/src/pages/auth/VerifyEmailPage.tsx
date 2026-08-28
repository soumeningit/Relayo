import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle, FiLock } from "react-icons/fi";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { OtpInput } from "../../components/ui/OtpInput";
import { PageLoader } from "../../components/ui/Spinner";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { setupMfa, verifyUser } from "../../api/services/AuthService";

type Phase = "verifying" | "error" | "verified" | "mfa-setup" | "mfa-done";

function VerifyEmailPage() {
  useDocumentMeta({
    title: "Verify your email",
    description: "Confirm your email address to activate your Relayo account.",
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const { isLoading, run } = useApiCall();

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    run(() => verifyUser(token), { showErrorToast: false }).then(
      (response) => {
        if (cancelled) return;
        if (!response) {
          setErrorMessage(
            "This verification link is invalid or has expired. Please sign in to request a new one.",
          );
          setPhase("error");
          return;
        }
        setEmail(response.email);
        if (response.requiresMfaSetup && response.qrCode) {
          setQrCode(response.qrCode);
          setPhase("mfa-setup");
        } else {
          setPhase("verified");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [token, run]);

  const handleMfaSubmit = async () => {
    if (otp.length !== 6) return;
    const response = await run(() => setupMfa({ email, otp }), {
      successMessage: "Two-factor authentication enabled!",
    });
    if (response) setPhase("mfa-done");
  };

  if (!token) {
    return (
      <AuthLayout
        title="Verification failed"
        subtitle="We couldn't verify your email with this link."
      >
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6 text-center">
          <FiAlertCircle
            className="mx-auto text-red-500"
            size={40}
            aria-hidden="true"
          />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            No verification token was found in this link. Please use the exact
            link from your verification email.
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <Link to="/signin" className="flex-1">
            <Button variant="outline" fullWidth>
              Go to sign in
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button variant="ghost" fullWidth>
              Back home
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (phase === "verifying") {
    return (
      <AuthLayout title="Verifying your email…">
        <PageLoader />
      </AuthLayout>
    );
  }

  if (phase === "error") {
    return (
      <AuthLayout
        title="Verification failed"
        subtitle="We couldn't verify your email with this link."
      >
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6 text-center">
          <FiAlertCircle
            className="mx-auto text-red-500"
            size={40}
            aria-hidden="true"
          />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {errorMessage}
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <Link to="/signin" className="flex-1">
            <Button variant="outline" fullWidth>
              Go to sign in
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button variant="ghost" fullWidth>
              Back home
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (phase === "mfa-setup") {
    return (
      <AuthLayout
        title="Set up two-factor authentication"
        subtitle="Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit code."
      >
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/12 text-indigo-500 dark:text-indigo-300">
            <FiLock aria-hidden="true" />
          </span>
          {qrCode && (
            <img
              src={qrCode}
              alt="QR code for authenticator app"
              className="mx-auto mt-5 h-44 w-44 rounded-xl border border-border bg-white p-2"
            />
          )}
          <p className="mt-3 font-mono text-xs text-muted-foreground">{email}</p>

          <div className="mt-6">
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
          </div>

          <Button
            fullWidth
            className="mt-6"
            isLoading={isLoading}
            disabled={otp.length !== 6}
            onClick={handleMfaSubmit}
          >
            Confirm & enable MFA
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={phase === "mfa-done" ? "You're all set!" : "Email verified"}
      subtitle={
        phase === "mfa-done"
          ? "Your email is verified and two-factor authentication is active."
          : "Your email address has been confirmed. Your account is now active."
      }
    >
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
        <FiCheckCircle
          className="mx-auto text-emerald-500"
          size={44}
          aria-hidden="true"
        />
        <p className="mt-4 text-sm text-muted-foreground">
          Ready to start delivering webhooks?
        </p>
      </div>
      <Button fullWidth className="mt-5" onClick={() => navigate("/signin")}>
        Continue to sign in
      </Button>
    </AuthLayout>
  );
}

export default VerifyEmailPage;
