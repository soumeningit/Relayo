import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArchive,
  FiCheckCircle,
  FiChevronRight,
  FiInbox,
  FiMoreHorizontal,
  FiTrash2,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  Spinner,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { DropdownMenu, MenuItem } from "../../components/ui/DropdownMenu";
import { AdminSearchInput } from "../../components/admin/SearchInput";
import type {
  AdminContactMessage,
  AdminContactStatus,
} from "../../types/admin";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "../../types/pagination";
import { Pagination } from "../../components/dashboard/Pagination";
import { formatDate } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import * as adminService from "../../api/services/adminApi";

const selectClasses =
  "h-10 rounded-xl border border-border bg-input px-3.5 text-sm text-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const statusOptions: { value: AdminContactStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "READ", label: "Read" },
  { value: "ARCHIVED", label: "Archived" },
];

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

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

function AdminInboxPage() {
  useDocumentMeta({
    title: "Inbox",
    description: "Contact messages submitted through the public site.",
  });

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<AdminContactStatus | "all">("all");
  const [messages, setMessages] = useState<AdminContactMessage[] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminService
      .listContactMessages(
        {
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
        },
        { page, pageSize },
      )
      .then((result) => {
        if (cancelled) return;
        setMessages(result.items);
        setPagination(result.pagination);
        if (result.items.length === 0 && result.pagination.total > 0) {
          setPage(1);
        }
      })
      .catch((error) => {
        console.error("Error fetching contact messages:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, page, pageSize]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  const patchMessage = (updated: AdminContactMessage) => {
    setMessages((prev) =>
      prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : prev,
    );
  };

  const handleMarkRead = async (message: AdminContactMessage) => {
    setBusyId(message.id);
    try {
      const updated = await adminService.markContactRead(message.id);
      patchMessage(updated);
      toast.success("Message marked as read.");
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Could not mark the message as read.");
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (message: AdminContactMessage) => {
    setBusyId(message.id);
    try {
      const updated = await adminService.archiveContactMessage(message.id);
      patchMessage(updated);
      toast.success("Message archived.");
    } catch (error) {
      console.error("Error archiving message:", error);
      toast.error("Could not archive the message.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setBusyId(deleteId);
    try {
      await adminService.deleteContactMessage(deleteId);
      setMessages((prev) => (prev ? prev.filter((m) => m.id !== deleteId) : prev));
      setDeleteId(null);
      toast.success("Message deleted.");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Could not delete the message.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteTarget = messages?.find((m) => m.id === deleteId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Inbox
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Contact messages submitted through the public site.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search name, email or message…"
            className="w-full sm:w-64"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminContactStatus | "all");
              setPage(1);
            }}
            className={`${selectClasses} w-full sm:w-44`}
            aria-label="Filter by status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {messages === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : messages.length === 0 && pagination.total === 0 ? (
          <EmptyState
            icon={<FiInbox />}
            title="No messages found"
            description={
              search || status !== "all"
                ? "Nothing matches the current filters. Try a different query."
                : "Messages from the contact form appear here."
            }
          />
        ) : (
          <>
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Sender</TH>
                  <TH>Message</TH>
                  <TH>Status</TH>
                  <TH>Received</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <tbody>
                {messages.map((message) => (
                  <TR
                    key={message.id}
                    onClick={() => navigate(`/admin/dashboard/inbox/${message.id}`)}
                  >
                    <TD>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {message.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {message.email}
                        </span>
                      </span>
                    </TD>
                    <TD className="max-w-md">
                      <p className="line-clamp-2 text-sm text-foreground">
                        {message.message}
                      </p>
                    </TD>
                    <TD>
                      <StatusPill status={message.status} />
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatDate(message.receivedAt)}
                    </TD>
                    <TD className="text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu
                          trigger={
                            <button
                              aria-label={`Manage message from ${message.name}`}
                              disabled={busyId === message.id}
                              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            >
                              <FiMoreHorizontal aria-hidden="true" />
                            </button>
                          }
                        >
                          {(close) => (
                            <>
                              {message.status !== "READ" &&
                                message.status !== "ARCHIVED" && (
                                  <MenuItem
                                    disabled={busyId === message.id}
                                    icon={<FiCheckCircle size={15} />}
                                    onClick={() => {
                                      close();
                                      handleMarkRead(message);
                                    }}
                                  >
                                    Mark as read
                                  </MenuItem>
                                )}
                              {message.status !== "ARCHIVED" && (
                                <MenuItem
                                  disabled={busyId === message.id}
                                  icon={<FiArchive size={15} />}
                                  onClick={() => {
                                    close();
                                    handleArchive(message);
                                  }}
                                >
                                  Archive
                                </MenuItem>
                              )}
                              <MenuItem
                                disabled={busyId === message.id}
                                danger
                                icon={<FiTrash2 size={15} />}
                                onClick={() => {
                                  close();
                                  setDeleteId(message.id);
                                }}
                              >
                                Delete
                              </MenuItem>
                              <MenuItem
                                icon={<FiChevronRight size={15} />}
                                onClick={() => {
                                  close();
                                  navigate(
                                    `/admin/dashboard/inbox/${message.id}`,
                                  );
                                }}
                              >
                                Open message
                              </MenuItem>
                            </>
                          )}
                        </DropdownMenu>
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
            {pagination.total > 0 && (
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                hasMore={pagination.hasMore}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => {
          if (busyId === null) setDeleteId(null);
        }}
        onConfirm={handleDelete}
        title="Delete message"
        message={`Delete the contact message from ${deleteTarget?.name ?? "this sender"}? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={busyId !== null}
      />
    </div>
  );
}

export default AdminInboxPage;
