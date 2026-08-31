import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  FiArchive,
  FiArrowLeft,
  FiCheckCircle,
  FiInbox,
  FiMail,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog, EmptyState, Spinner } from "../../components/ui";
import type {
  AdminContactMessage,
  AdminContactStatus,
} from "../../types/admin";
import { formatDate } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import * as adminService from "../../api/services/adminApi";

const statusStyles: Record<AdminContactStatus, string> = {
  NEW: "border border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  READ: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  ARCHIVED: "border border-border bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status: AdminContactStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}
    >
      <span className="capitalize">{status.toLowerCase()}</span>
    </span>
  );
}

function mailtoHref(message: AdminContactMessage, reply: string): string {
  const subject = "Re: Relayo enquiry";
  const body = [reply.trim(), "", "--", `Original message:`, message.message]
    .filter((line, index) => line !== "" || index === 0)
    .join("\n");
  return `mailto:${message.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

function AdminInboxDetailPage() {
  const { messageId = "" } = useParams<{ messageId: string }>();
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Message",
    description: "Contact message details.",
  });

  const [message, setMessage] = useState<AdminContactMessage | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!messageId) return;
    let cancelled = false;

    adminService
      .getContactMessage(messageId)
      .then((result) => {
        if (!cancelled) {
          setMessage(result);
          if (result.replyText) setReply(result.replyText);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  const patchMessage = (updated: AdminContactMessage) => {
    setMessage(updated);
    if (updated.replyText) setReply(updated.replyText);
  };

  const runAction = async (
    action: string,
    fn: () => Promise<AdminContactMessage | void>,
    success: string,
  ) => {
    setBusyAction(action);
    try {
      const result = await fn();
      if (result && !("deleted" in result)) patchMessage(result as AdminContactMessage);
      toast.success(success);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleMarkRead = () => {
    if (!message) return;
    return runAction(
      "read",
      () => adminService.markContactRead(message.id),
      "Message marked as read.",
    );
  };

  const handleArchive = () => {
    if (!message) return;
    return runAction(
      "archive",
      () => adminService.archiveContactMessage(message.id),
      "Message archived.",
    );
  };

  const handleSaveReply = () => {
    if (!message) return;
    if (reply.trim().length === 0) {
      toast.error("Write a reply before saving.");
      return;
    }
    return runAction(
      "reply",
      () => adminService.replyToContactMessage(message.id, reply.trim()),
      "Reply saved.",
    );
  };

  const handleConfirmDelete = async () => {
    if (!message) return;
    setBusyAction("delete");
    try {
      await adminService.deleteContactMessage(message.id);
      setConfirmDelete(false);
      toast.success("Message deleted.");
      navigate("/admin/dashboard/inbox");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete the message.");
      setBusyAction(null);
    }
  };

  if (notFound) {
    return (
      <EmptyState
        icon={<FiInbox />}
        title="Message not found"
        description="It may have been deleted or never existed."
        action={
          <Link
            to="/admin/dashboard/inbox"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-500"
          >
            Back to inbox
          </Link>
        }
      />
    );
  }

  if (!message) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const replied = message.repliedAt !== null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/dashboard/inbox"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <FiArrowLeft aria-hidden="true" /> Inbox
          </Link>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Message from {message.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {message.id} · {formatDate(message.receivedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={message.status} />
          {message.status !== "READ" && message.status !== "ARCHIVED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={busyAction !== null}
              isLoading={busyAction === "read"}
              onClick={handleMarkRead}
            >
              <FiCheckCircle aria-hidden="true" /> Mark as read
            </Button>
          )}
          {message.status !== "ARCHIVED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={busyAction !== null}
              isLoading={busyAction === "archive"}
              onClick={handleArchive}
            >
              <FiArchive aria-hidden="true" /> Archive
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            disabled={busyAction !== null}
            onClick={() => setConfirmDelete(true)}
          >
            <FiTrash2 aria-hidden="true" /> Delete
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Message</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message.message}
            </p>
            {message.replyText && (
              <div className="mt-6 rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <FiSend size={12} aria-hidden="true" /> Our reply
                  {message.repliedByEmail && (
                    <span className="font-mono">· {message.repliedByEmail}</span>
                  )}
                  {message.repliedAt && (
                    <span>· {formatDate(message.repliedAt)}</span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {message.replyText}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Reply</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Save the reply for the record, then open it in your own email
              client to send it to {message.email}.
            </p>
            <textarea
              rows={5}
              placeholder="Write your reply…"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              className="mt-3 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={busyAction !== null}
                isLoading={busyAction === "reply"}
                onClick={handleSaveReply}
              >
                {replied ? "Update reply" : "Save reply"}
              </Button>
              <a
                href={mailtoHref(message, reply)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-500"
              >
                <FiMail aria-hidden="true" /> Open in email client
              </a>
            </div>
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="text-sm font-semibold text-foreground">Sender</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {message.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5">
                <a
                  href={`mailto:${message.email}`}
                  className="font-mono text-indigo-500 hover:text-indigo-400 dark:text-indigo-300"
                >
                  {message.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Received</dt>
              <dd className="mt-0.5 text-foreground">
                {formatDate(message.receivedAt)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => {
          if (busyAction !== "delete") setConfirmDelete(false);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete message"
        message={`Delete the contact message from ${message.name}? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={busyAction === "delete"}
      />
    </div>
  );
}

export default AdminInboxDetailPage;
