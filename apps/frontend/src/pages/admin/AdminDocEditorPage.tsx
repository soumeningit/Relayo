import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiLink } from "react-icons/fi";
import { Button, Card, Input, Spinner, EmptyState } from "../../components/ui";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { getApiErrorMessage } from "../../lib/apiError";
import {
  createAdminDoc,
  getAdminDoc,
  updateAdminDoc,
} from "../../api/services/adminApi";

const textAreaClasses =
  "w-full rounded-xl border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-2 border-border hover:border-indigo-400/50 focus:border-indigo-400 focus:ring-indigo-500/30";

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminDocEditorPage() {
  useDocumentMeta({
    title: "Edit doc",
    description: "Write or edit a docs article.",
  });

  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { run, isLoading } = useApiCall();

  const [loaded, setLoaded] = useState(isNew);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [published, setPublished] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    slug?: string;
    content?: string;
  }>({});

  useEffect(() => {
    if (isNew) return;

    let cancelled = false;
    getAdminDoc(id)
      .then((doc) => {
        if (cancelled) return;
        setTitle(doc.title);
        setSlug(doc.slug);
        setSlugTouched(true);
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
  }, [id, isNew]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setFieldErrors((prev) => ({ ...prev, title: undefined }));
    if (!slugTouched) {
      setSlug(slugifyTitle(value));
    }
  };

  const handleSave = () => {
    const nextErrors: { title?: string; slug?: string; content?: string } = {};
    const nextSlug = slug.trim() || slugifyTitle(title);

    if (!title.trim()) nextErrors.title = "Title is required";
    if (!nextSlug) nextErrors.slug = "Slug is required";
    if (!content.trim()) nextErrors.content = "Content is required";

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      slug: nextSlug,
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content,
      published,
      authorName: authorName.trim() || null,
    };

    if (isNew) {
      run(() => createAdminDoc(payload), {
        successMessage: "Document created",
        onSuccess: () => navigate("/admin/dashboard/docs"),
      });
    } else {
      run(() => updateAdminDoc(id, payload), {
        successMessage: "Document saved",
        onSuccess: () => navigate("/admin/dashboard/docs"),
      });
    }
  };

  if (!loaded && !isNew) {
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard/docs")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <FiArrowLeft aria-hidden="true" /> Back to docs
        </button>
        <h1 className="order-last w-full font-display text-2xl font-bold tracking-tight text-foreground sm:order-none sm:w-auto sm:text-3xl">
          {isNew ? "New doc" : "Edit doc"}
        </h1>
        <Button onClick={handleSave} isLoading={isLoading}>
          {isNew ? "Create doc" : "Save changes"}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Content
            </h2>
            <div className="mt-4 space-y-4">
              <Input
                label="Title"
                placeholder="Setting up webhooks with HTTPS"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                error={fieldErrors.title}
              />
              <div>
                <Input
                  label="Slug"
                  placeholder="setting-up-webhooks-with-https"
                  leftIcon={<FiLink aria-hidden="true" />}
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugTouched(true);
                    setFieldErrors((prev) => ({ ...prev, slug: undefined }));
                  }}
                  error={fieldErrors.slug}
                  hint="Used in the public URL — lowercase letters, numbers and hyphens."
                />
              </div>
              <div>
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
              <div>
                <label
                  htmlFor="doc-content"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Content{" "}
                  <span className="font-normal text-muted-foreground">
                    (Markdown supported)
                  </span>
                </label>
                <textarea
                  id="doc-content"
                  rows={16}
                  placeholder={"## Intro\n\nWrite your article in Markdown…"}
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.content}
                  className={textAreaClasses}
                />
                {fieldErrors.content && (
                  <p role="alert" className="mt-1.5 text-xs text-red-500">
                    {fieldErrors.content}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="font-display text-base font-semibold text-foreground">
              Publishing
            </h2>
            <div className="mt-4 space-y-4">
              <Input
                label="Author name"
                placeholder="Relayo team"
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                hint="Shown on the article byline."
              />
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-indigo-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">
                    Publish to /docs
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Drafts stay hidden from the public site.
                  </span>
                </span>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminDocEditorPage;