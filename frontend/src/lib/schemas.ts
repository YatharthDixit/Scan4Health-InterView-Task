import { z } from "zod";

/** Runtime definitions of the API contract. TypeScript types are
 * inferred from these — shapes are never written twice. */

export const StatusSchema = z.enum(["new", "in_review", "approved", "rejected"]);
export type Status = z.infer<typeof StatusSchema>;

export const SortSchema = z.enum([
  "newest",
  "oldest",
  "patient",
  "age_desc",
  "age_asc",
]);
export type QueueSort = z.infer<typeof SortSchema>;

export const AgeGroupSchema = z.enum(["pediatric", "adult", "senior"]);
export type AgeGroup = z.infer<typeof AgeGroupSchema>;

export const SubmissionSchema = z.object({
  id: z.number(),
  patient_name: z.string(),
  age: z.number(),
  phone: z.string(),
  primary_concern: z.string(),
  status: StatusSchema,
  allowed_transitions: z.array(StatusSchema),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export const StatusEventSchema = z.object({
  id: z.number(),
  from_status: StatusSchema,
  to_status: StatusSchema,
  created_at: z.string(),
});
export type StatusEvent = z.infer<typeof StatusEventSchema>;

export const ReviewCommentSchema = z.object({
  id: z.number(),
  author: z.string(),
  body: z.string(),
  created_at: z.string(),
});
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;

export const SubmissionDetailSchema = SubmissionSchema.extend({
  events: z.array(StatusEventSchema),
  comments: z.array(ReviewCommentSchema),
});
export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;

export const PaginatedSubmissionsSchema = z.object({
  results: z.array(SubmissionSchema),
  pagination: z.object({
    count: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number(),
    has_next: z.boolean(),
    has_previous: z.boolean(),
  }),
});
export type PaginatedSubmissions = z.infer<typeof PaginatedSubmissionsSchema>;

/** The backend's single error envelope. */
export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    detail: z.string(),
    extra: z.record(z.string(), z.unknown()).optional(),
  }),
});
