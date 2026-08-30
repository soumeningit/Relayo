import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiArrowLeft, FiCalendar, FiUser, FiXCircle } from "react-icons/fi";
import { buttonClasses } from "../../components/ui/buttonStyles";
import { EmptyState, Spinner } from "../../components/ui";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { getApiErrorMessage } from "../../lib/apiError";
import type { DocArticle } from "../../types/docs";
import { getDoc } from "../../api/services/docsApi";

function DocArticleView({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<DocArticle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta({
    title: doc ? `${doc.title} — Docs` : "Docs",
    description: doc?.excerpt ?? undefined,
  });

  useEffect(() => {
    let cancelled = false;

    getDoc(slug)
      .then((article) => {
        if (cancelled) return;
        setDoc(article);
        setNotFound(false);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDoc(null);
        if (
          typeof err === "object" &&
          err !== null &&
          "status" in err &&
          (err as { status?: number }).status === 404
        ) {
          setNotFound(true);
          setError(null);
        } else {
          setNotFound(false);
          setError(getApiErrorMessage(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <section className="px-5 pb-20 pt-28 sm:px-8 lg:pt-32">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/docs"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <FiArrowLeft aria-hidden="true" /> All docs
        </Link>

        {error ? (
          <EmptyState
            icon={<FiXCircle />}
            title="Couldn't load this article"
            description={error}
          />
        ) : notFound ? (
          <EmptyState
            icon={<FiXCircle />}
            title="Article not found"
            description="This document doesn't exist or isn't published yet."
          />
        ) : doc === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : (
          <article>
            <header className="mb-8 border-b border-border pb-8">
              <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {doc.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {doc.publishedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <FiCalendar size={14} aria-hidden="true" />
                    {new Date(doc.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
                {doc.authorName && (
                  <span className="inline-flex items-center gap-1.5">
                    <FiUser size={14} aria-hidden="true" />
                    {doc.authorName}
                  </span>
                )}
              </div>
            </header>

            <div className="doc-content text-[15px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {doc.content}
              </ReactMarkdown>
            </div>

            <footer className="mt-12 border-t border-border pt-8">
              <Link
                to="/docs"
                className={buttonClasses("outline", "md", false, "inline-flex")}
              >
                <FiArrowLeft className="mr-2" aria-hidden="true" /> Back to all
                docs
              </Link>
            </footer>
          </article>
        )}
      </div>
    </section>
  );
}

function DocsDetailPage() {
  const { slug = "" } = useParams();
  return <DocArticleView key={slug} slug={slug} />;
}

export default DocsDetailPage;