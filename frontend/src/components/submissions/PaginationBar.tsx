import type { PaginatedSubmissions } from "@/lib/schemas";

type Props = {
  pagination: PaginatedSubmissions["pagination"];
  onPage: (page: number) => void;
};

const BUTTON =
  "rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink hover:border-line-strong disabled:opacity-40 disabled:pointer-events-none";

export function PaginationBar({ pagination, onPage }: Props) {
  const { count, page, page_size, total_pages, has_next, has_previous } =
    pagination;
  if (total_pages <= 1) return null;

  const from = (page - 1) * page_size + 1;
  const to = Math.min(page * page_size, count);

  return (
    <div className="flex flex-col gap-2 border-t border-line bg-surface-muted/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-xs text-ink-faint">
        {from}–{to} of {count}
      </p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="font-mono text-xs text-ink-muted">
          Page {page} of {total_pages}
        </span>
        <div className="flex gap-1.5">
          <button
            className={BUTTON}
            disabled={!has_previous}
            onClick={() => onPage(page - 1)}
          >
            ← Prev
          </button>
          <button
            className={BUTTON}
            disabled={!has_next}
            onClick={() => onPage(page + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
