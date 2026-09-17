import { describe, expect, test } from "bun:test";
import tsconfig from "./tsconfig.json";

describe("frontend tsconfig", () => {
  test("excludes Playwright files from Next typecheck", () => {
    expect(tsconfig.exclude).toContain("e2e");
    expect(tsconfig.exclude).toContain("playwright.config.ts");
  });
});
