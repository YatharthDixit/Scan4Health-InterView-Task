import type { ListFilters } from "./api/submissions";

/** Query key factory — invalidation is never stringly-typed. */
export const submissionKeys = {
  all: ["submissions"] as const,
  lists: () => [...submissionKeys.all, "list"] as const,
  list: (filters: ListFilters) => [...submissionKeys.lists(), filters] as const,
  detail: (id: number) => [...submissionKeys.all, "detail", id] as const,
};
