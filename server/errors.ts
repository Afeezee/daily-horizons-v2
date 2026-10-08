import { HTTPException } from "hono/http-exception";

export class ApiError extends HTTPException {
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(status as any, { message });
    this.code = code;
  }
  toJSON() {
    return { error: this.code, message: this.message };
  }
}

export const Errors = {
  badRequest: (msg = "Bad request") => new ApiError(400, "bad_request", msg),
  unauthorized: (msg = "Not signed in") => new ApiError(401, "unauthorized", msg),
  forbidden: (msg = "Forbidden") => new ApiError(403, "forbidden", msg),
  notFound: (msg = "Not found") => new ApiError(404, "not_found", msg),
  conflict: (msg = "Conflict") => new ApiError(409, "conflict", msg),
  rateLimited: (msg = "Rate limit exceeded") => new ApiError(429, "rate_limited", msg),
  internal: (msg = "Server error") => new ApiError(500, "internal_error", msg),
  unavailable: (msg = "Service unavailable") => new ApiError(503, "service_unavailable", msg),
};
