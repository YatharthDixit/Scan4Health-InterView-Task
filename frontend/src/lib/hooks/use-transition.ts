"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import { transitionSubmission } from "@/lib/api/submissions";
import { submissionKeys } from "@/lib/query-keys";
import type {
  PaginatedSubmissions,
  Status,
  SubmissionDetail,
} from "@/lib/schemas";
import { STATUS_CONFIG } from "@/lib/status";

/** Optimistic transition applied to both caches (detail + every list).
 *
 * The optimistic frame is deliberately dumb: it sets the new status and
 * *empties* allowed_transitions rather than recomputing them — the
 * frontend never re-implements the state machine. Server truth arrives
 * milliseconds later via onSuccess/onSettled and fills the actions in.
 */
export function useTransitionSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: Status }) =>
      transitionSubmission(id, to),

    onMutate: async ({ id, to }) => {
      await queryClient.cancelQueries({ queryKey: submissionKeys.all });

      const snapshot = {
        detail: queryClient.getQueryData<SubmissionDetail>(
          submissionKeys.detail(id),
        ),
        lists: queryClient.getQueriesData<PaginatedSubmissions>({
          queryKey: submissionKeys.lists(),
        }),
      };

      queryClient.setQueryData<SubmissionDetail>(
        submissionKeys.detail(id),
        (old) =>
          old && { ...old, status: to, allowed_transitions: [] },
      );
      queryClient.setQueriesData<PaginatedSubmissions>(
        { queryKey: submissionKeys.lists() },
        (old) =>
          old && {
            ...old,
            results: old.results.map((s) =>
              s.id === id ? { ...s, status: to, allowed_transitions: [] } : s,
            ),
          },
      );

      return snapshot;
    },

    onError: (error, { id }, snapshot) => {
      if (snapshot) {
        queryClient.setQueryData(submissionKeys.detail(id), snapshot.detail);
        for (const [key, data] of snapshot.lists) {
          queryClient.setQueryData(key, data);
        }
      }
      if (error instanceof ApiError && error.code === "invalid_transition") {
        toast.error("This submission was updated by someone else.", {
          description: "Refreshing to show the latest status.",
        });
      } else if (error instanceof ApiError) {
        toast.error(error.detail);
      } else {
        toast.error("Something went wrong.");
      }
    },

    onSuccess: (fresh) => {
      queryClient.setQueryData(submissionKeys.detail(fresh.id), fresh);
      toast.success(`Moved to ${STATUS_CONFIG[fresh.status].label}`);
    },

    // Always resettle from the server: removes rows that no longer match
    // the active filter and restores real allowed_transitions.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: submissionKeys.all }),
  });
}
