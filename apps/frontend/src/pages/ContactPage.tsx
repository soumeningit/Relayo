import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  FiClock,
  FiHelpCircle,
  FiMail,
  FiMapPin,
  FiSend,
} from "react-icons/fi";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/layout/MarketingLayout";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useApiCall } from "../hooks/useApiCall";
import { validateEmail, validateName } from "../lib/validation";
import { submitContact } from "../api/services/ContactService";

const channels = [
  {
    icon: FiMail,
    title: "Email support",
    detail: "support@relayo.app",
    hint: "Technical issues & account questions",
  },
  {
    icon: FiHelpCircle,
    title: "Sales & volume",
    detail: "sales@relayo.app",
    hint: "Custom plans, SLAs and migrations",
  },
  {
    icon: FiClock,
    title: "Response time",
    detail: "< 24 hours",
    hint: "Priority plans get a dedicated engineer",
  },
];

function ContactPage() {
  useDocumentMeta({
    title: "Contact",
    description:
      "Get in touch with the Relayo team — technical support, sales questions or feedback. We respond within 24 hours.",
  });

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});
  const [sent, setSent] = useState(false);
  const { isLoading, run } = useApiCall();

  const setField =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      message:
        form.message.trim().length < 10
          ? "Tell us a little more (at least 10 characters)"
          : undefined,
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    await run(() => submitContact(form), {
      successMessage: "Message sent! We'll get back to you within 24 hours.",
    });
    setSent(true);
  };

  return (
    <>
      <PageHeader
        badge="Contact"
        title={
          <>
            Talk to the team behind{" "}
            <span className="text-gradient">the pipeline</span>
          </>
        }
        subtitle="Questions about reliability, pricing or migrations — real humans answer here."
      />

      <section className="px-5 pb-20 pt-4 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Channels */}
          <div className="space-y-4">
            {channels.map((channel) => (
              <Card
                key={channel.title}
                hover
                className="flex items-start gap-4 p-5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 dark:text-indigo-300">
                  <channel.icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{channel.title}</p>
                  <p className="truncate font-mono text-sm text-indigo-500 dark:text-indigo-300">
                    {channel.detail}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {channel.hint}
                  </p>
                </div>
              </Card>
            ))}

            <Card className="flex items-start gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 dark:text-indigo-300">
                <FiMapPin size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium text-foreground">Status page</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pipeline health and incident history — coming with the public
                  launch.
                </p>
              </div>
            </Card>
          </div>

          {/* Form */}
          <Card className="p-7 sm:p-8">
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-500 dark:text-emerald-300">
                  <FiSend size={24} aria-hidden="true" />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                  Message received
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Thanks {form.name.split(" ")[0]} — we'll reply at {form.email}{" "}
                  within one business day.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setSent(false);
                    setForm({ name: "", email: "", message: "" });
                  }}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Input
                  label="Your name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  value={form.name}
                  onChange={setField("name")}
                  error={errors.name}
                  disabled={isLoading}
                />
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
                <div>
                  <label
                    htmlFor="contact-message"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder="Tell us about your webhook workload…"
                    value={form.message}
                    onChange={setField("message")}
                    aria-invalid={!!errors.message}
                    disabled={isLoading}
                    className={`w-full rounded-xl border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-2 ${
                      errors.message
                        ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/30"
                        : "border-border hover:border-indigo-400/50 focus:border-indigo-400 focus:ring-indigo-500/30"
                    }`}
                  />
                  {errors.message && (
                    <p role="alert" className="mt-1.5 text-xs text-red-500">
                      {errors.message}
                    </p>
                  )}
                </div>

                <Button type="submit" fullWidth isLoading={isLoading}>
                  Send message <FiSend aria-hidden="true" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  We'll only use this to reply to your enquiry.
                </p>
              </form>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}

export default ContactPage;
