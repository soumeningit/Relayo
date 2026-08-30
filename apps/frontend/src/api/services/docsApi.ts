import type { DocArticle, DocSummary } from "../../types/docs";
import { api } from "../axios";

export async function listDocs(): Promise<DocSummary[]> {
  const res = await api.get<{ success: boolean; data: DocSummary[] }>("/docs");
  return res.data.data;
}

export async function getDoc(slug: string): Promise<DocArticle> {
  const res = await api.get<{ success: boolean; data: DocArticle }>(
    `/docs/${encodeURIComponent(slug)}`,
  );
  return res.data.data;
}