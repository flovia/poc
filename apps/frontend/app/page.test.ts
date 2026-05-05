import { describe, expect, test } from "bun:test";
import { resolveRootRedirectPath } from "./root-redirect";

describe("root route", () => {
  test("redirects to the provider picker", () => {
    expect(resolveRootRedirectPath()).toBe("/providers");
  });
});
