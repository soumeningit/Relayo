import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiFeather, FiLink, FiType } from "react-icons/fi";
import { Button, Card, Input } from "../../components/ui";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useApiCall } from "../../hooks/useApiCall";
import { slugifyTitle } from "../../lib/slugify";
import { createAdminDoc } from "../../api/services/adminApi";

function AdminNewDocPage() {
  useDocumentMeta({
    title: "New doc",
    description: "Create a new docs article draft.",
  });

  const navigate = useNavigate();
  const { run, isLoading } = useApiCall();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    slug?: string;
  }>({});

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setFieldErrors((prev) => ({ ...prev, title: undefined }));
    if (!slugTouched) {
      setSlug(slugifyTitle(value));
    }
  };

  const handleCreate = () => {
    const nextSlug = slug.trim() || slugifyTitle(title);
    const errors: { title?: string; slug?: string } = {};
    if (!title.trim()) errors.title = "Title is required";
    if (!nextSlug) errors.slug = "Slug is required";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    run(
      () =>
        createAdminDoc({
          slug: nextSlug,
          title: title.trim(),
          excerpt: excerpt.trim() || null,
          content: `# ${title.trim()}\n\nStart writing your article…`,
          published: false,
          authorName: authorName.trim() || null,
        }),
      {
        successMessage: "Draft created",
        onSuccess: (doc) => navigate(`/admin/dashboard/docs/${doc.id}/edit`),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/admin/dashboard/docs")}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <FiArrowLeft aria-hidden="true" /> Back to docs
      </button>

      <Card className="overflow-hidden">
        <div className="bg-linear-to-br from-indigo-500/12 via-violet-500/10 to-cyan-400/10 px-7 pb-6 pt-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
            <FiFeather size={22} aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create a post
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set up the basics first — you can write and review the article in
            the editor next.
          </p>
        </div>

        <div className="space-y-4 p-7">
          <Input
            label="Title"
            placeholder="Setting up webhooks with HTTPS"
            leftIcon={<FiType aria-hidden="true" />}
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            error={fieldErrors.title}
          />
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
          <div>
            <label
              htmlFor="new-doc-excerpt"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Excerpt
            </label>
            <textarea
              id="new-doc-excerpt"
              rows={2}
              maxLength={500}
              placeholder="One or two sentences shown on the /docs listing."
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <Input
            label="Author name"
            placeholder="Relayo team"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            hint="Shown on the article byline."
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/dashboard/docs")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isLoading}>
              Create post
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AdminNewDocPage;