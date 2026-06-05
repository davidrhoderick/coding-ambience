import type { ApiFailure, ApiSuccess } from "./api-types.js";

export function isApiSuccess(value: unknown): value is ApiSuccess<unknown>;
export function isApiSuccess<T>(value: unknown, dataGuard: (data: unknown) => data is T): value is ApiSuccess<T>;
export function isApiSuccess<T>(value: unknown, dataGuard?: (data: unknown) => data is T): boolean {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== true || !("data" in value)) {
    return false;
  }

  return dataGuard === undefined || dataGuard(value.data);
}

export function isApiFailure(value: unknown): value is ApiFailure {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== false || !("error" in value)) {
    return false;
  }

  const error = value.error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "recoverable" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.recoverable === "boolean"
  );
}
