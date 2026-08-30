export interface DocSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  publishedAt: string | null;
}

export interface DocArticle extends DocSummary {
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocInput {
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
  published?: boolean;
  authorName?: string | null;
}