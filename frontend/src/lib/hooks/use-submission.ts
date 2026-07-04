"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getSubmission } from "@/lib/api/submissions";
import { submissionKeys } from "@/lib/query-keys";
import type { PaginatedSubmissions, SubmissionDetail } from "@/lib/schemas";

export function useSubmission(id: number | null) {
  const queryClient = useQueryClient();
  const placeholderData = findSubmissionInListCache(queryClient, id);

  return useQuery({
    queryKey: submissionKeys.detail(id ?? -1),
    queryFn: ({ signal }) => getSubmission(id!, signal),
    enabled: id !== null,
    // Seed from whatever list page already has this row so the panel
    // opens instantly. It's placeholder (not initialData) because list
    // rows lack `events` — the real detail still gets fetched, and the
    // panel shows a timeline skeleton while isPlaceholderData is true.
    placeholderData,
  });
}

function findSubmissionInListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number | null,
): SubmissionDetail | undefined {
  if (id === null) return undefined;

  const lists = queryClient.getQueriesData<PaginatedSubmissions>({
    queryKey: submissionKeys.lists(),
  });
  for (const [, data] of lists) {
    const match = data?.results.find((submission) => submission.id === id);
    if (match) return { ...match, events: [], comments: [] };
  }
  return undefined;
}
