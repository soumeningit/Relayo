import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiCalendar, FiUser } from "react-icons/fi";
import type { DocArticle } from "../../types/docs";

export function DocArticleView({ doc }: { doc: DocArticle }) {
  return (
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
    </article>
  );
}