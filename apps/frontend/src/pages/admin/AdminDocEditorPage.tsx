import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiArrowLeft,
  FiColumns,
  FiEdit3,
  FiEye,
  FiSave,
  FiSettings,
} from "react-icons/fi";
import { Button, Card, EmptyState, Input, Spinner } from "../../components/ui";
import { DocArticleView } from "../../components/docs/DocArticleView";
import { MarkdownToolbar } from "../../components/docs/MarkdownToolbar";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { getApiErrorMessage } from "../../lib/apiError";
import { slugifyTitle } from "../../lib/slugify";
import { getAdminDoc, updateAdminDoc } from "../../api/services/adminApi";
import type { DocArticle, DocInput } from "../../types/docs";

type EditorMode = "write" | "split" | "review";

const textAreaClasses =
  "w-full resize-y rounded-xl border bg-input px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-2 border-border hover:border-indigo-400/50 focus:border-indigo-400 focus:ring-indigo-500/30";

const modes: { key: EditorMode; label: string; icon: ReactNode }[] = [
  { key: "write", label: "Write", icon: <FiEdit3 size={15} /> },
  { key: "split", label: "Split", icon: <FiColumns size={15} /> },
  { key: "review", label: "Review", icon: <FiEye size={15} /> },
];

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

function AdminDocEditorPage() {
  useDocumentMeta({
    title: "Edit doc",
    description: "Write or edit a docs article.",
  });

  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { run, isLoading } = useApiCall();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [base, setBase] = useState<DocArticle | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [published, setPublished] = useState(false);

  const [mode, setMode] = useState<EditorMode>("write");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; slug?: string }>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAdminDoc(id)
      .then((doc) => {
        if (cancelled) return;
        setBase(doc);
        setTitle(doc.title);
        setSlug(doc.slug);
        setExcerpt(doc.excerpt ?? "");
        setContent(doc.content);
        setAuthorName(doc.authorName ?? "");
        setPublished(doc.published);
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(getApiErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const previewDoc: DocArticle | null = base
    ? {
        ...base,
        title: title.trim() || "Untitled",
        slug: slug.trim() || slugifyTitle(title),
        excerpt: excerpt.trim() || null,
        content,
        authorName: authorName.trim() || null,
        published,
        publishedAt: published
          ? (base.publishedAt ?? new Date().toISOString())
          : null,
      }
    : null;

  const togglePublish = () => {
    run(() => updateAdminDoc(id, { published: !published }), {
      successMessage: published ? "Unpublished" : "Published to /docs",
      onSuccess: () => setPublished(!published),
    });
  };

  const handleSave = () => {
    const nextSlug = slug.trim() || slugifyTitle(title);
    const errors: { title?: string; slug?: string } = {};
    if (!title.trim()) errors.title = "Title is required";
    if (!nextSlug) errors.slug = "Slug is required";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: Partial<DocInput> = {
      title: title.trim(),
      slug: nextSlug,
      excerpt: excerpt.trim() || null,
      authorName: authorName.trim() || null,
      published,
    };
    if (content.trim()) payload.content = content;

    run(() => updateAdminDoc(id, payload), {
      successMessage: "Document saved",
      onSuccess: () => navigate("/admin/dashboard/docs"),
    });
  };

  if (!loaded && !loadError) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-5">
        <EmptyState
          icon={<FiArrowLeft />}
          title="Couldn't load this document"
          description={loadError}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard/docs")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <FiArrowLeft aria-hidden="true" /> Docs
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title || "Untitled"}
            </h1>
            <DocStatusBadge published={published} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {wordCount} words · {content.length} characters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={published ? "outline" : "primary"}
            size="sm"
            onClick={togglePublish}
            disabled={isLoading}
          >
            {published ? "Unpublish" : "Publish to /docs"}
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={isLoading}>
            <FiSave className="mr-1.5" aria-hidden="true" /> Save
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-border bg-muted/50 p-1" role="tablist">
          {modes.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            settingsOpen
              ? "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FiSettings size={15} aria-hidden="true" /> Settings
        </button>
      </div>

      {settingsOpen && (
        <Card className="mt-4 grid gap-4 p-6 sm:grid-cols-2">
          <Input
            label="Title"
            placeholder="Setting up webhooks with HTTPS"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            error={fieldErrors.title}
          />
          <Input
            label="Slug"
            placeholder="setting-up-webhooks-with-https"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setFieldErrors((prev) => ({ ...prev, slug: undefined }));
            }}
            error={fieldErrors.slug}
            hint="Used in the public URL — lowercase letters, numbers and hyphens."
          />
          <div className="sm:col-span-2">
            <label
              htmlFor="doc-excerpt"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Excerpt
            </label>
            <textarea
              id="doc-excerpt"
              rows={2}
              maxLength={500}
              placeholder="One or two sentences shown on the /docs listing."
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              className={textAreaClasses}
            />
          </div>
          <Input
            label="Author name"
            placeholder="Relayo team"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            hint="Shown on the article byline."
          />
        </Card>
      )}

      <div className="mt-4">
        {mode === "write" && (
          <div>
            <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
            <textarea
              ref={textareaRef}
              rows={20}
              minLength={1}
              placeholder={"## Intro\n\nWrite your article in Markdown…"}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className={`${textAreaClasses} min-h-[60vh] rounded-t-none`}
            />
          </div>
        )}

        {mode === "split" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
              <textarea
                ref={textareaRef}
                rows={20}
                placeholder={"## Intro\n\nWrite your article in Markdown…"}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className={`${textAreaClasses} min-h-[60vh] rounded-t-none`}
              />
            </div>
            <div className="min-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card/50 p-6">
              {content.trim() ? (
                <div className="doc-content text-[15px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    icon={<FiEdit3 />}
                    title="Nothing to preview"
                    description="Start typing and the live preview appears here."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "review" && (
          <div className="rounded-xl border border-border bg-card/50 px-6 py-10 sm:px-10">
            <div className="mx-auto max-w-3xl">
              {previewDoc && content.trim() ? (
                <DocArticleView doc={previewDoc} />
              ) : (
                <EmptyState
                  icon={<FiEye />}
                  title="Nothing to review yet"
                  description="Write some content first, then review the article as your readers will see it."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDocEditorPage;