export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationQueryOptions {
  page?: number;
  pageSize?: number;
}

export function parsePaginationQuery(
  filters: PaginationQueryOptions = {},
): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, Math.floor(Number(filters.page) || 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(filters.pageSize) || DEFAULT_PAGE_SIZE)),
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function buildPagination(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

export function pageResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): { items: T[]; pagination: PaginationMeta } {
  return { items, pagination: buildPagination(page, pageSize, total) };
}