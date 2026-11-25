import { describe, expect, it } from "vitest";
import { canSwitchMode, isDataMode, isDemoRole, resolveMode } from "@/demo/rules";

describe("canSwitchMode", () => {
  it.each([
    [{ APP_ENV: "local", NODE_ENV: "production" }, true],
    [{ APP_ENV: "test", NODE_ENV: "production" }, true],
    [{ APP_ENV: "production", NODE_ENV: "development" }, false],
    [{ APP_ENV: "staging", NODE_ENV: "development" }, false],
    [{ NODE_ENV: "development" }, true],
    [{ NODE_ENV: "production" }, false],
    [{}, false],
  ])("%j → %s", (env, expected) => {
    expect(canSwitchMode(env)).toBe(expected);
  });
});

describe("resolveMode", () => {
  it("운영에서는 목업 쿠키가 있어도 실제 API를 쓴다", () => {
    expect(resolveMode({ APP_ENV: "production" }, "mock")).toBe("api");
    expect(resolveMode({ NODE_ENV: "production" }, undefined)).toBe("api");
  });
  it("전환할 수 있으면 기본은 목업이고 고른 값을 따른다", () => {
    expect(resolveMode({ APP_ENV: "test" }, undefined)).toBe("mock");
    expect(resolveMode({ APP_ENV: "test" }, "이상한 값")).toBe("mock");
    expect(resolveMode({ APP_ENV: "test" }, "api")).toBe("api");
  });
});

it("정해진 모드와 역할만 받는다", () => {
  expect(isDataMode("api")).toBe(true);
  expect(isDataMode("prod")).toBe(false);
  expect(isDemoRole("admin")).toBe(true);
  expect(isDemoRole("owner")).toBe(false);
});
