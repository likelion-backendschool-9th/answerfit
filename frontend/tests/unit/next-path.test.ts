import { expect, it } from "vitest";
import { safeNextPath } from "@/lib/next-path";

it.each([
  ["/interviews/new", "/interviews/new"],
  ["/my?tab=1", "/my?tab=1"],
  ["//evil.example", "/"],
  ["/\\evil.example", "/"],
  ["https://evil.example", "/"],
  ["/\n/evil.example", "/"],
  ["", "/"],
  [null, "/"],
])("%j → %s", (value, expected) => {
  expect(safeNextPath(value)).toBe(expected);
});
