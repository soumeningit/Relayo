import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBookOpen, FiCalendar } from "react-icons/fi";
import { EmptyState, Spinner } from "../../components/ui";
import { PageHeader } from "../../components/layout/MarketingLayout";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { getApiErrorMessage } from "../../lib/apiError";
import type { DocSummary } from "../../types/docs";
import { listDocs } from "../../api/services/docsApi";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DocsListPage() {
  useDocumentMeta({
    title: "Docs",
    description:
      "Guides, best practices and platform notes from the Relayo team.",
  });

  const [docs, setDocs] = useState<DocSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listDocs()
      .then((items) => {
        if (cancelled) return;
        setDocs(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDocs([]);
        setError(getApiErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        badge="Docs"
        title={
          <>
            Guides from{" "}
            <span className="text-gradient">the pipeline team</span>
          </>
        }
        subtitle="Tutorials, webhook best practices and everything new on Relayo — written for developers."
      />

      <section className="px-5 pb-20 pt-4 sm:px-8">
        <div className="mx-auto max-w-5xl">
          {error ? (
            <EmptyState
              icon={<FiBookOpen />}
              title="Couldn't load docs"
              description={error}
            />
          ) : docs === null ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8 text-indigo-500" />
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={<FiBookOpen />}
              title="No articles yet"
              description="Guides are on the way — check back soon."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {docs.map((doc) => (
                <Link
                  key={doc.slug}
                  to={`/docs/${doc.slug}`}
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-card/50 p-6 transition-colors hover:border-indigo-400/50 hover:bg-card"
                >
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-300">
                      {doc.title}
                    </h2>
                    {doc.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {doc.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-3">
                      {doc.publishedAt && (
                        <span className="inline-flex items-center gap-1.5">
                          <FiCalendar size={12} aria-hidden="true" />
                          {formatDate(doc.publishedAt)}
                        </span>
                      )}
                      {doc.authorName && <span>{doc.authorName}</span>}
                    </span>
                    <span className="inline-flex items-center gap-1 text-indigo-500 transition-transform group-hover:translate-x-0.5 dark:text-indigo-300">
                      Read <FiArrowRight size={12} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default DocsListPage;