import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { buttonClasses } from "../ui/buttonStyles";
import { PAGE_SIZE_OPTIONS } from "../../types/pagination";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const selectClasses =
  "h-9 rounded-lg border border-border bg-input px-2.5 text-sm text-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const navButtonClasses =
  "inline-flex h-9 items-center justify-center gap-1 px-3 text-sm font-medium";

function rangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "No entries";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `Showing ${from}–${to} of ${total}`;
}

export function Pagination({
  page,
  pageSize,
  totalPages,
  total,
  hasMore,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <label
          htmlFor={`page-size-${pageSize}`}
          className="text-xs text-muted-foreground"
        >
          Entries per page
        </label>
        <select
          id={`page-size-${pageSize}`}
          aria-label="Entries per page"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className={selectClasses}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        {rangeLabel(page, pageSize, total)}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className={buttonClasses("outline", "sm", false, navButtonClasses)}
        >
          <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
          Prev
        </button>
        <span className="min-w-20 text-center text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={!hasMore || isLoading}
          onClick={() => onPageChange(page + 1)}
          className={buttonClasses("outline", "sm", false, navButtonClasses)}
        >
          Next
          <FiChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}