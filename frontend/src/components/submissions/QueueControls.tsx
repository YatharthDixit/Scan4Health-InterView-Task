import type { AgeGroup, QueueSort } from "@/lib/schemas";

import { FilterIcon, XIcon } from "./icons";

type Props = {
  ageGroup: AgeGroup | undefined;
  dateFrom: string;
  dateTo: string;
  sort: QueueSort;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onAgeGroupChange: (ageGroup: AgeGroup | null) => void;
  onDateRangeChange: (range: { dateFrom?: string; dateTo?: string }) => void;
  onSortChange: (sort: QueueSort) => void;
  onClearAdvancedFilters: () => void;
};

const SORT_OPTIONS: { value: QueueSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "patient", label: "Patient A-Z" },
  { value: "age_desc", label: "Age high-low" },
  { value: "age_asc", label: "Age low-high" },
];

const AGE_LABELS: Record<AgeGroup, string> = {
  pediatric: "Pediatric",
  adult: "Adult",
  senior: "Senior",
};

const SORT_LABELS: Record<QueueSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  patient: "Patient A-Z",
  age_desc: "Age high-low",
  age_asc: "Age low-high",
};

const CONTROL_CLASS =
  "h-9 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink-muted outline-none transition-colors hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/15";

export function QueueControls({
  ageGroup,
  dateFrom,
  dateTo,
  sort,
  filtersOpen,
  onToggleFilters,
  onAgeGroupChange,
  onDateRangeChange,
  onSortChange,
  onClearAdvancedFilters,
}: Props) {
  const activeAdvancedCount =
    Number(Boolean(ageGroup)) + Number(Boolean(dateFrom || dateTo));

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,1fr)] gap-2 sm:flex sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors ${
            filtersOpen || activeAdvancedCount > 0
              ? "border-accent/30 bg-accent-wash text-accent-deep"
              : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
          }`}
        >
          <FilterIcon />
          Filters
          {activeAdvancedCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] text-on-accent">
              {activeAdvancedCount}
            </span>
          )}
        </button>

        <label>
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as QueueSort)}
            className={`${CONTROL_CLASS} w-full pr-8 sm:w-44`}
            aria-label="Sort queue"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(activeAdvancedCount > 0 || sort !== "newest") && (
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {ageGroup && (
            <FilterChip
              label={`Age: ${AGE_LABELS[ageGroup]}`}
              onRemove={() => onAgeGroupChange(null)}
            />
          )}
          {(dateFrom || dateTo) && (
            <FilterChip
              label={`Received: ${formatDateRange(dateFrom, dateTo)}`}
              onRemove={() =>
                onDateRangeChange({ dateFrom: undefined, dateTo: undefined })
              }
            />
          )}
          {sort !== "newest" && (
            <FilterChip
              label={`Sort: ${SORT_LABELS[sort]}`}
              onRemove={() => onSortChange("newest")}
            />
          )}
          {activeAdvancedCount > 0 && (
            <button
              type="button"
              onClick={onClearAdvancedFilters}
              className="h-7 rounded-md px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-control hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full border border-line bg-surface-muted pl-2.5 pr-1 text-xs font-medium text-ink-muted">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="inline-flex size-5 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-skeleton hover:text-ink"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

function formatDateRange(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
  if (dateFrom) return `from ${dateFrom}`;
  return `until ${dateTo}`;
}
