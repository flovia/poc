import { describe, expect, test } from "bun:test";
import { createBffHandler } from "../src/http";

const request = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);

describe("BFF routes", () => {
  test("serves minimal read-only endpoints", async () => {
    const handler = createBffHandler();

    for (const path of ["/", "/health"] as const) {
      const response = handler(request(path));
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toContain("application/json");
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({ service: "flovia-bff", status: "ok" }),
      );
    }
  });

  test("rejects non-GET requests to read-only endpoints", async () => {
    const handler = createBffHandler();
    const response = handler(request("/health", { method: "POST" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(405);
    expect(body.error).toBe("method_not_allowed");
  });

  test("returns JSON not found for unsupported routes", async () => {
    const handler = createBffHandler();
    const response = handler(request("/unknown"));
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.message).toContain("/unknown");
  });
});
