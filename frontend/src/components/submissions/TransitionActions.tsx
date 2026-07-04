"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { useTransitionSubmission } from "@/lib/hooks/use-transition";
import type { Status, SubmissionDetail } from "@/lib/schemas";
import { STATUS_CONFIG } from "@/lib/status";

import { ArrowRightIcon, CheckIcon, XIcon } from "./icons";

type Props = {
  submission: SubmissionDetail;
};

const WORKFLOW_COPY: Record<Status, string> = {
  new: "Waiting for the front desk to begin review.",
  in_review: "Review is active. Choose the final intake outcome.",
  approved: "Approved intakes are ready for the next care workflow.",
  rejected: "Rejected intakes are closed for this review cycle.",
};

export function TransitionActions({ submission }: Props) {
  const [confirmState, setConfirmState] = useState<{
    submissionId: number;
    status: Status;
    target: Status;
  } | null>(null);
  const transition = useTransitionSubmission();
  const confirmTarget =
    confirmState?.submissionId === submission.id &&
    confirmState.status === submission.status
      ? confirmState.target
      : null;

  function submit(target: Status) {
    const config = STATUS_CONFIG[target];
    if (config.actionNeedsConfirm && confirmTarget !== target) {
      setConfirmState({
        submissionId: submission.id,
        status: submission.status,
        target,
      });
      return;
    }
    transition.mutate({ id: submission.id, to: target });
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line bg-surface-muted px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
              Current state
            </p>
            <p className="mt-1 text-sm font-semibold">
              {STATUS_CONFIG[submission.status].label}
            </p>
          </div>
          <span
            className={`mt-0.5 size-2.5 rounded-full ${STATUS_CONFIG[submission.status].dotClass}`}
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 text-[13px] leading-5 text-ink-muted">
          {WORKFLOW_COPY[submission.status]}
        </p>
      </div>

      {submission.allowed_transitions.length === 0 ? (
        <div className="flex items-start gap-3 px-3 py-3">
          <IconFrame tone="neutral">
            <CheckIcon />
          </IconFrame>
          <div>
            <p className="text-sm font-semibold">No further actions</p>
            <p className="mt-0.5 text-[13px] leading-5 text-ink-muted">
              This status is terminal in the current review workflow.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 px-3 py-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Available next steps
          </p>
          {submission.allowed_transitions.map((target) => {
            const config = STATUS_CONFIG[target];
            const confirming = confirmTarget === target;
            const destructive = target === "rejected";

            return (
              <div
                key={target}
                className={`rounded-md border px-3 py-3 transition-colors ${
                  confirming
                    ? "border-danger-border bg-danger-wash"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <div className="flex items-start gap-3">
                  <IconFrame tone={destructive ? "danger" : "success"}>
                    {destructive ? <XIcon /> : <ArrowRightIcon />}
                  </IconFrame>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {config.actionLabel}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-5 text-ink-muted">
                          {config.actionDescription}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={transition.isPending}
                        onClick={() => submit(target)}
                        className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-55 ${
                          destructive && confirming
                            ? "bg-danger text-on-accent hover:bg-danger-deep"
                            : config.actionClass
                        }`}
                      >
                        {config.actionNeedsConfirm && confirming ? (
                          <CheckIcon />
                        ) : (
                          <ArrowRightIcon />
                        )}
                        {config.actionNeedsConfirm && confirming
                          ? `Confirm ${config.actionLabel.toLowerCase()}`
                          : config.actionLabel}
                      </button>
                    </div>
                    {confirming && (
                      <p className="mt-2 rounded border border-danger-border bg-surface px-2.5 py-1.5 text-xs font-medium text-danger-strong">
                        Rejection is final for this submission.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {confirmTarget && !transition.isPending && (
            <button
              type="button"
              onClick={() => setConfirmState(null)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <XIcon />
              Cancel pending confirmation
            </button>
          )}
        </div>
      )}
      {transition.isPending && (
        <p className="border-t border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
          Updating status
        </p>
      )}
    </div>
  );
}

function IconFrame({
  tone,
  children,
}: {
  tone: "success" | "danger" | "neutral";
  children: ReactNode;
}) {
  const classes = {
    success: "border-success-border bg-success-wash text-success-strong",
    danger: "border-danger-border bg-danger-wash text-danger-strong",
    neutral: "border-neutral-border bg-surface-muted text-ink-muted",
  };
  return (
    <span
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md border ${classes[tone]}`}
    >
      {children}
    </span>
  );
}
