import { describe, expect, it } from "vitest";
import { addDays, isExpired } from "./dates";

describe("date helpers", () => {
  it("adds days to an ISO timestamp", () => {
    expect(addDays("2026-04-01T00:00:00.000Z", 14)).toBe("2026-04-15T00:00:00.000Z");
  });

  it("detects expired timestamps", () => {
    expect(isExpired("2020-01-01T00:00:00.000Z")).toBe(true);
  });
});
