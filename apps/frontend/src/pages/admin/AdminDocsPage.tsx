import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiEdit2,
  FiEye,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Spinner,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { timeAgo } from "../../lib/time";
import { getApiErrorMessage } from "../../lib/apiError";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import type { DocArticle } from "../../types/docs";
import * as opsService from "../../api/services/adminApi";

function DocStatusBadge({ published }: { published: boolean }) {
  if (published) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-medium capitalize text-emerald-600 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      Draft
    </span>
  );
}

function AdminDocsPage() {
  useDocumentMeta({
    title: "Docs",
    description: "Write and publish docs, guides and blog articles.",
  });

  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocArticle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocArticle | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { run } = useApiCall();

  useEffect(() => {
    let cancelled = false;

    opsService
      .listAdminDocs()
      .then((items) => {
        if (cancelled) return;
        setDocs(items);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setDocs([]);
        setLoadError(getApiErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const handleTogglePublish = (doc: DocArticle) => {
    setBusyId(doc.id);
    run(
      () => opsService.updateAdminDoc(doc.id, { published: !doc.published }),
      {
        successMessage: doc.published ? "Unpublished" : "Published",
        onSuccess: reload,
      },
    ).finally(() => setBusyId(null));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    run(() => opsService.deleteAdminDoc(deleteTarget.id), {
      successMessage: "Document deleted",
      onSuccess: () => {
        setDeleteTarget(null);
        reload();
      },
    }).finally(() => setBusyId(null));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Docs
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Write and publish docs, guides and blog articles.
          </p>
        </div>
        <Button onClick={() => navigate("/admin/dashboard/docs/new")}>
          <FiPlus className="mr-2" aria-hidden="true" /> New doc
        </Button>
      </div>

      <div className="mt-5">
        {loadError ? (
          <EmptyState
            icon={<FiBookOpen />}
            title="Couldn't load docs"
            description={loadError}
          />
        ) : docs === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={<FiBookOpen />}
            title="No docs yet"
            description="Create your first article to publish it to /docs."
          />
        ) : (
          <>
            <TableWrapper>
              <THead>
                <TR>
                  <TH>Title</TH>
                  <TH>Slug</TH>
                  <TH>Author</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Updated</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <tbody>
                {docs.map((doc) => (
                  <TR key={doc.id}>
                    <TD>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/admin/dashboard/docs/${doc.id}/edit`)
                        }
                        className="text-left font-medium text-foreground transition-colors hover:text-indigo-500 dark:hover:text-indigo-300"
                      >
                        {doc.title}
                      </button>
                    </TD>
                    <TD className="font-mono text-xs text-muted-foreground">
                      {doc.slug}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {doc.authorName ?? "—"}
                    </TD>
                    <TD>
                      <DocStatusBadge published={doc.published} />
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {timeAgo(doc.updatedAt)}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          aria-label={`Edit ${doc.title}`}
                          disabled={busyId !== null}
                          onClick={() =>
                            navigate(`/admin/dashboard/docs/${doc.id}/edit`)
                          }
                        >
                          <FiEdit2 size={15} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={
                            doc.published ? "Unpublish" : "Publish"
                          }
                          disabled={busyId !== null}
                          onClick={() => handleTogglePublish(doc)}
                        >
                          <FiEye size={15} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete"
                          aria-label={`Delete ${doc.title}`}
                          disabled={busyId !== null}
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
                          onClick={() => setDeleteTarget(doc)}
                        >
                          <FiTrash2 size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableWrapper>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (busyId === null) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete doc"
        message={`Delete "${deleteTarget?.title ?? "this document"}"? This removes it from the public /docs site permanently.`}
        confirmLabel="Delete"
        isLoading={busyId !== null}
      />
    </div>
  );
}

export default AdminDocsPage;