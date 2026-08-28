import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiMail } from "react-icons/fi";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { forgotPassword } from "../../api/services/AuthService";
import { validateEmail } from "../../lib/validation";

function ForgotPasswordPage() {
  useDocumentMeta({
    title: "Forgot password",
    description:
      "Request a password reset link for your Relayo account. The link expires in 60 minutes.",
  });

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const { isLoading, run } = useApiCall();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(undefined);

    const response = await run(() => forgotPassword({ email }), {
      showErrorToast: false,
    });
    if (response) setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="If an account exists for that email, a reset link is on its way. It expires in 60 minutes."
      >
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
          <FiMail
            className="mx-auto text-emerald-500"
            size={40}
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Didn't receive it? Check your spam folder or try again in a few
            minutes.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            to="/signin"
            className="font-medium text-indigo-500 hover:underline dark:text-indigo-300"
          >
            Back to sign in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email linked to your account and we'll send you a secure reset link."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setEmail(event.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          disabled={isLoading}
          leftIcon={<FiMail aria-hidden="true" />}
        />

        <Button type="submit" fullWidth isLoading={isLoading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          to="/signin"
          className="font-medium text-indigo-500 hover:underline dark:text-indigo-300"
        >
          ← Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
