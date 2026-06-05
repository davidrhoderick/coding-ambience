import { describe, expect, it } from "vitest";
import { isApiFailure, isApiSuccess } from "./contracts.js";

describe("api response contracts", () => {
  it("detects successful responses", () => {
    expect(isApiSuccess({ ok: true, data: { value: 1 } })).toBe(true);
    expect(isApiFailure({ ok: true, data: { value: 1 } })).toBe(false);
  });

  it("detects failure responses", () => {
    expect(
      isApiFailure({
        ok: false,
        error: { code: "missing-workspace", message: "Missing workspace", recoverable: true }
      })
    ).toBe(true);
  });
});
