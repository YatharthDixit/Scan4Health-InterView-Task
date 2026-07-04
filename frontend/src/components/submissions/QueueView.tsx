"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { useSubmissions } from "@/lib/hooks/use-submissions";
import {
  AgeGroupSchema,
  SortSchema,
  StatusSchema,
  type AgeGroup,
  type QueueSort,
  type Status,
} from "@/lib/schemas";

import { CreateInboundSheet } from "./CreateInboundSheet";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { FilterTabs } from "./FilterTabs";
import { PlusIcon } from "./icons";
import { PaginationBar } from "./PaginationBar";
import { QueueControls } from "./QueueControls";
import { QueueTable } from "./QueueTable";
import { QueueTableSkeleton } from "./QueueTableSkeleton";
import { SearchInput } from "./SearchInput";
import { SubmissionSheet } from "./SubmissionSheet";

const AGE_GROUP_OPTIONS: { value: AgeGroup | ""; label: string }[] = [
  { value: "", label: "All ages" },
  { value: "pediatric", label: "Pediatric" },
  { value: "adult", label: "Adult" },
  { value: "senior", label: "Senior" },
];

const FILTER_CONTROL_CLASS =
  "h-9 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink-muted outline-none transition-colors hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/15";

/** Owns the URL: filter, search, page, and the selected submission all
 * live in query params, so the view is refresh-safe and shareable. */
export function QueueView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const statusParam = searchParams.get("status");
  const status = StatusSchema.safeParse(statusParam).success
    ? (statusParam as Status)
    : undefined;
  const search = (searchParams.get("search") ?? "").trim();
  const ageGroupParam = searchParams.get("age_group");
  const ageGroup = AgeGroupSchema.safeParse(ageGroupParam).success
    ? (ageGroupParam as AgeGroup)
    : undefined;
  const sortParam = searchParams.get("sort");
  const sort = SortSchema.safeParse(sortParam).success
    ? (sortParam as QueueSort)
    : "newest";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const selectedParam = searchParams.get("selected");
  const selectedId = /^\d+$/.test(selectedParam ?? "")
    ? Number(selectedParam)
    : null;
  const createOpen = searchParams.get("new") === "1";

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.size > 0 ? `${pathname}?${params}` : pathname;
      router.replace(query, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const query = useSubmissions({
    status,
    ageGroup,
    search,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sort,
    page,
  });
  const submissions = query.data?.results;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-6 py-5">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">
              ScanOS · Front Desk
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight">
              Scan4Health
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              Patient intake queue
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
          <div className="space-y-3 border-b border-line bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterTabs
                active={status}
                onChange={(next) => updateParams({ status: next, page: null })}
              />
              <button
                type="button"
                onClick={() => updateParams({ new: "1", selected: null })}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-deep"
              >
                <PlusIcon />
                New inbound
              </button>
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-start">
              <div className="min-w-[260px] max-w-[460px] flex-1">
                <SearchInput
                  value={search}
                  onChange={(next) => updateParams({ search: next, page: null })}
                />
              </div>
              <QueueControls
                ageGroup={ageGroup}
                dateFrom={dateFrom}
                dateTo={dateTo}
                sort={sort}
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen((open) => !open)}
                onAgeGroupChange={(next) =>
                  updateParams({ age_group: next, page: null })
                }
                onDateRangeChange={(next) =>
                  updateParams({
                    date_from: next.dateFrom ?? null,
                    date_to: next.dateTo ?? null,
                    page: null,
                  })
                }
                onSortChange={(next) =>
                  updateParams({
                    sort: next === "newest" ? null : next,
                    page: null,
                  })
                }
                onClearAdvancedFilters={() =>
                  updateParams({
                    age_group: null,
                    date_from: null,
                    date_to: null,
                    page: null,
                  })
                }
              />
            </div>

            {filtersOpen && (
              <div className="border-t border-line pt-3">
                <div className="mx-auto w-full max-w-3xl rounded-md border border-line bg-surface-muted/70 p-3">
                  <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                    <AgeGroupField
                      value={ageGroup}
                      onChange={(value) =>
                        updateParams({ age_group: value, page: null })
                      }
                    />

                    <DateFilterField
                      id="date-from"
                      label="From"
                      value={dateFrom}
                      onChange={(value) =>
                        updateParams({
                          date_from: value || null,
                          page: null,
                        })
                      }
                    />

                    <DateFilterField
                      id="date-to"
                      label="To"
                      value={dateTo}
                      onChange={(value) =>
                        updateParams({
                          date_to: value || null,
                          page: null,
                        })
                      }
                    />

                    {(ageGroup || dateFrom || dateTo) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateParams({
                            age_group: null,
                            date_from: null,
                            date_to: null,
                            page: null,
                          })
                        }
                        className="h-9 rounded-md border border-line bg-surface px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink sm:col-span-3 sm:justify-self-end"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {query.isPending ? (
            <QueueTableSkeleton />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : submissions && submissions.length === 0 ? (
            <EmptyState status={status} search={search} />
          ) : (
            submissions && (
              <>
                <QueueTable
                  submissions={submissions}
                  selectedId={selectedId}
                  dimmed={query.isPlaceholderData}
                  onSelect={(id) => updateParams({ selected: String(id) })}
                />
                <PaginationBar
                  pagination={query.data.pagination}
                  onPage={(next) =>
                    updateParams({ page: next > 1 ? String(next) : null })
                  }
                />
              </>
            )
          )}
        </div>
      </main>

      <SubmissionSheet
        id={selectedId}
        onClose={() => updateParams({ selected: null })}
      />
      <CreateInboundSheet
        open={createOpen}
        onClose={() => updateParams({ new: null })}
        onCreated={(submission) =>
          updateParams({
            new: null,
            selected: String(submission.id),
            status: null,
            age_group: null,
            search: null,
            date_from: null,
            date_to: null,
            sort: null,
            page: null,
          })
        }
      />
    </div>
  );
}

function AgeGroupField({
  value,
  onChange,
}: {
  value: AgeGroup | undefined;
  onChange: (value: AgeGroup | null) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
        Age group
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "" ? null : (next as AgeGroup));
        }}
        className={`${FILTER_CONTROL_CLASS} mt-1.5 w-full pr-8`}
      >
        {AGE_GROUP_OPTIONS.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilterField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block w-full">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${FILTER_CONTROL_CLASS} mt-1.5 w-full`}
      />
    </label>
  );
}
