import { useEffect } from "react";

const DEFAULT_TITLE = "Relayo — Reliable Webhook Delivery Platform";
const DEFAULT_DESCRIPTION =
  "Relayo is a reliable webhook delivery platform with automatic retries, exponential backoff, HMAC signing, circuit breakers and full delivery logs.";

type MetaAttr = "name" | "property";

function upsertMeta(attr: MetaAttr, key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

interface DocumentMeta {
  title?: string;
  description?: string;
}

export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    const finalTitle = title ? `${title} · Relayo` : DEFAULT_TITLE;
    const finalDescription = description ?? DEFAULT_DESCRIPTION;

    document.title = finalTitle;
    upsertMeta("name", "description", finalDescription);
    upsertMeta("property", "og:title", finalTitle);
    upsertMeta("property", "og:description", finalDescription);
    upsertMeta("name", "twitter:title", finalTitle);
    upsertMeta("name", "twitter:description", finalDescription);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description]);
}
