import { z } from "zod";

import { ApiErrorBodySchema } from "@/lib/schemas";

/** Every failure — HTTP, network, or timeout — surfaces as this one
 * class. `detail` is always safe to show in a toast. */
export class ApiError extends Error {
  constructor(
    public code: string,
    public detail: string,
    public status: number, // 0 for network-level failures
    public extra?: Record<string, unknown>,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const REQUEST_TIMEOUT_MS = 10_000;

/** The single path every API call goes through: one fetch wrapper, one
 * error shape, and zod validation of success bodies so contract drift
 * fails loudly instead of leaking `undefined` into the UI. */
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    if (e instanceof DOMException && e.name === "TimeoutError") {
      throw new ApiError("timeout", "The server took too long to respond.", 0);
    }
    throw new ApiError("network_error", "Could not reach the server.", 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const parsed = ApiErrorBodySchema.safeParse(body);
    if (parsed.success) {
      const { code, detail, extra } = parsed.data.error;
      throw new ApiError(code, detail, res.status, extra);
    }
    throw new ApiError("http_error", `Request failed (${res.status}).`, res.status);
  }

  return schema.parse(await res.json());
}
