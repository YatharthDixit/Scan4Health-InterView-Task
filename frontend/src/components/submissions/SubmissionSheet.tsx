"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { formatFull, formatRelative } from "@/lib/date";
import { useSubmission } from "@/lib/hooks/use-submission";
import type { SubmissionDetail } from "@/lib/schemas";

import { AuditTimeline } from "./AuditTimeline";
import { AlertIcon, CloseIcon } from "./icons";
import { ReviewComments } from "./ReviewComments";
import { StatusBadge } from "./StatusBadge";
import { TransitionActions } from "./TransitionActions";

type Props = {
  id: number | null;
  onClose: () => void;
};

export function SubmissionSheet({ id, onClose }: Props) {
  const open = id !== null;
  const query = useSubmission(id);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const submission = query.data;
  const title = submission
    ? `${submission.patient_name} details`
    : "Submission details";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-sheet-title"
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Close submission details"
        onClick={onClose}
        className="absolute inset-0 bg-overlay/25 [animation:fade-in_120ms_ease-out]"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col overflow-hidden border-l border-line bg-surface shadow-2xl [animation:sheet-in_160ms_ease-out]">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              Patient intake
            </p>
            <h2
              id="submission-sheet-title"
              className="mt-1 truncate text-lg font-semibold"
              title={title}
            >
              {submission?.patient_name ?? "Submission details"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {query.isPending && !submission ? (
            <SheetSkeleton />
          ) : query.isError && !submission ? (
            <SheetError error={query.error} onRetry={() => query.refetch()} />
          ) : submission ? (
            <SubmissionContent
              submission={submission}
              loadingEvents={query.isPlaceholderData}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function SubmissionContent({
  submission,
  loadingEvents,
}: {
  submission: SubmissionDetail;
  loadingEvents: boolean;
}) {
  return (
    <div className="space-y-6 px-5 py-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={submission.status} />
        <time
          dateTime={submission.created_at}
          title={formatFull(submission.created_at)}
          className="font-mono text-xs text-ink-faint"
        >
          Received {formatRelative(submission.created_at)}
        </time>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <DetailBlock label="Age" value={String(submission.age)} />
        <DetailBlock
          label="Phone"
          value={
            <a
              href={`tel:${submission.phone.replace(/\s/g, "")}`}
              className="transition-colors hover:text-accent"
            >
              {submission.phone}
            </a>
          }
        />
        <DetailBlock
          label="Created"
          value={formatFull(submission.created_at)}
          className="col-span-2 sm:col-span-1"
        />
        <DetailBlock
          label="Updated"
          value={formatFull(submission.updated_at)}
          className="col-span-2 sm:col-span-1"
        />
      </section>

      <section>
        <h3 className="text-sm font-semibold">Primary concern</h3>
        <p className="mt-2 rounded-md border border-line bg-surface-muted px-3 py-3 text-sm leading-6 text-ink-muted">
          {submission.primary_concern}
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Review workflow</h3>
        <div className="mt-2">
          <TransitionActions submission={submission} />
        </div>
      </section>

      <section>
        <ReviewComments
          key={submission.id}
          submission={submission}
          loadingComments={loadingEvents}
        />
      </section>

      <section className="pb-2">
        <h3 className="text-sm font-semibold">Audit timeline</h3>
        <div className="mt-3">
          <AuditTimeline
            submission={submission}
            loadingEvents={loadingEvents}
          />
        </div>
      </section>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-line px-3 py-2.5 ${className}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1 min-w-0 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function SheetError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const isNotFound = error instanceof ApiError && error.code === "not_found";
  const detail =
    error instanceof ApiError
      ? error.detail
      : "Something went wrong while loading this submission.";

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-full border border-danger-border bg-danger-wash">
        <AlertIcon />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {isNotFound ? "Submission not found" : "Couldn't load submission"}
      </h3>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{detail}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-deep"
      >
        Try again
      </button>
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading submission"
      className="space-y-6 px-5 py-5"
    >
      <div className="flex justify-between gap-4">
        <div className="h-6 w-24 rounded-full bg-skeleton/80" />
        <div className="h-4 w-28 rounded bg-skeleton/70" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="h-16 rounded-md border border-line bg-surface-muted"
            style={{ animation: `shimmer 1.4s ease-in-out ${row * 90}ms infinite` }}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-skeleton/80" />
        <div className="h-28 rounded-md border border-line bg-surface-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-skeleton/80" />
        <div className="h-10 w-36 rounded-md bg-skeleton/80" />
      </div>
    </div>
  );
}
