"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { formatFull, formatRelative } from "@/lib/date";
import { useCreateComment } from "@/lib/hooks/use-create-comment";
import type { ReviewComment, SubmissionDetail } from "@/lib/schemas";

import { PlusIcon } from "./icons";

type Props = {
  submission: SubmissionDetail;
  loadingComments: boolean;
};

export function ReviewComments({ submission, loadingComments }: Props) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateComment(submission.id);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError("Add a note before saving.");
      return;
    }

    create.mutate(
      { author: author.trim() || undefined, body: trimmedBody },
      {
        onSuccess: () => {
          setAuthor("");
          setBody("");
          setError(null);
        },
      },
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-3">
        <p className="text-sm font-semibold">Review notes</p>
        <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-faint">
          {submission.comments.length}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 border-b border-line px-4 py-3"
      >
        <textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setError(null);
          }}
          rows={3}
          placeholder="Add a review note..."
          className="min-h-20 w-full resize-none rounded-md border border-line bg-surface px-3 py-2.5 text-[13px] leading-5 outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <input
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Reviewer"
              className="h-9 w-40 rounded-md border border-line bg-surface px-3 text-[13px] font-medium outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            {error && (
              <p className="mt-1 text-xs font-medium text-danger">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-deep disabled:pointer-events-none disabled:opacity-55"
          >
            <PlusIcon />
            {create.isPending ? "Saving" : "Add note"}
          </button>
        </div>
      </form>

      <div className="px-4 py-3">
        {loadingComments ? (
          <CommentSkeleton />
        ) : submission.comments.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-3 py-3 text-[13px] text-ink-muted">
            No reviewer notes yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {submission.comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: ReviewComment }) {
  return (
    <li className="rounded-md border border-line bg-surface-muted px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{comment.author}</p>
        <time
          dateTime={comment.created_at}
          title={formatFull(comment.created_at)}
          className="shrink-0 font-mono text-[11px] text-ink-faint"
        >
          {formatRelative(comment.created_at)}
        </time>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink-muted">
        {comment.body}
      </p>
    </li>
  );
}

function CommentSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading review notes"
      className="space-y-2"
    >
      {[0, 1].map((row) => (
        <div
          key={row}
          className="h-16 rounded-md bg-surface-control"
          style={{ animation: `shimmer 1.4s ease-in-out ${row * 90}ms infinite` }}
        />
      ))}
    </div>
  );
}
