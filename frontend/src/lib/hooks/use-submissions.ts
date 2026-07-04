"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ListFilters, listSubmissions } from "@/lib/api/submissions";
import { submissionKeys } from "@/lib/query-keys";

export function useSubmissions(filters: ListFilters) {
  return useQuery({
    queryKey: submissionKeys.list(filters),
    queryFn: ({ signal }) => listSubmissions(filters, signal),
    // Keep showing the previous page while the next one loads so
    // filter/page changes never flash an empty table.
    placeholderData: keepPreviousData,
  });
}
