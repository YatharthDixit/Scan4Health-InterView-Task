"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import {
  createReviewComment,
  type CreateReviewCommentInput,
} from "@/lib/api/submissions";
import { submissionKeys } from "@/lib/query-keys";

export function useCreateComment(submissionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewCommentInput) =>
      createReviewComment(submissionId, input),
    onSuccess: (submission) => {
      queryClient.setQueryData(submissionKeys.detail(submission.id), submission);
      toast.success("Review note added");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.detail);
      } else {
        toast.error("Could not add review note.");
      }
    },
  });
}
