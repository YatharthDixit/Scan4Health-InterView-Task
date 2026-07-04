"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import {
  createSubmission,
  type CreateSubmissionInput,
} from "@/lib/api/submissions";
import { submissionKeys } from "@/lib/query-keys";

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSubmissionInput) => createSubmission(input),
    onSuccess: (submission) => {
      queryClient.setQueryData(submissionKeys.detail(submission.id), submission);
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
      toast.success("Inbound created", {
        description: `${submission.patient_name} is ready for review.`,
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.detail);
      } else {
        toast.error("Could not create inbound.");
      }
    },
  });
}
