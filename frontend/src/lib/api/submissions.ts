import { request } from "./client";
import {
  PaginatedSubmissionsSchema,
  SubmissionDetailSchema,
  type AgeGroup,
  type PaginatedSubmissions,
  type QueueSort,
  type Status,
  type SubmissionDetail,
} from "@/lib/schemas";

export type ListFilters = {
  status?: Status;
  ageGroup?: AgeGroup;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort: QueueSort;
  page: number;
};

export type CreateSubmissionInput = {
  patient_name: string;
  age: number;
  phone: string;
  primary_concern: string;
};

export type CreateReviewCommentInput = {
  author?: string;
  body: string;
};

export function listSubmissions(
  filters: ListFilters,
  signal?: AbortSignal,
): Promise<PaginatedSubmissions> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.ageGroup) params.set("age_group", filters.ageGroup);
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.size > 0 ? `?${params}` : "";
  return request(`/submissions/${query}`, PaginatedSubmissionsSchema, { signal });
}

export function getSubmission(
  id: number,
  signal?: AbortSignal,
): Promise<SubmissionDetail> {
  return request(`/submissions/${id}/`, SubmissionDetailSchema, { signal });
}

export function transitionSubmission(
  id: number,
  to: Status,
): Promise<SubmissionDetail> {
  return request(`/submissions/${id}/transition/`, SubmissionDetailSchema, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export function createSubmission(
  input: CreateSubmissionInput,
): Promise<SubmissionDetail> {
  return request("/submissions/", SubmissionDetailSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createReviewComment(
  id: number,
  input: CreateReviewCommentInput,
): Promise<SubmissionDetail> {
  return request(`/submissions/${id}/comments/`, SubmissionDetailSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
