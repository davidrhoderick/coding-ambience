import { describe, expect, it } from "vitest";
import { isApiFailure, isApiSuccess } from "./contracts.js";

describe("api response contracts", () => {
  it("detects successful responses", () => {
    expect(isApiSuccess({ ok: true, data: { value: 1 } })).toBe(true);
    expect(isApiFailure({ ok: true, data: { value: 1 } })).toBe(false);
  });

  it("validates success payloads when a guard is provided", () => {
    const hasValue = (value: unknown): value is { value: number } =>
      typeof value === "object" &&
      value !== null &&
      "value" in value &&
      typeof value.value === "number";

    expect(isApiSuccess({ ok: true, data: { value: 1 } }, hasValue)).toBe(true);
    expect(isApiSuccess({ ok: true, data: { value: "1" } }, hasValue)).toBe(false);
  });

  it("detects failure responses", () => {
    expect(
      isApiFailure({
        ok: false,
        error: { code: "missing-workspace", message: "Missing workspace", recoverable: true }
      })
    ).toBe(true);
  });

  it("rejects malformed failure responses", () => {
    expect(isApiFailure({ ok: false })).toBe(false);
    expect(
      isApiFailure({
        ok: false,
        error: { code: 404, message: "Missing workspace", recoverable: true }
      })
    ).toBe(false);
    expect(
      isApiFailure({
        ok: false,
        error: { code: "missing-workspace", message: "Missing workspace", recoverable: "yes" }
      })
    ).toBe(false);
  });
});
