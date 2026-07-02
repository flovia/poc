import { expect, test } from "@playwright/test";

test("provider picker renders with the BFF-backed catalog", async ({ page }) => {
  await page.goto("/providers");

  await expect(page.getByRole("heading", { name: "API Providers" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^CoinGecko x402\b/i })).toBeVisible({
    timeout: 20_000,
  });
});

test("pay skills proxy advertises the half-day discovery cache", async ({ request }) => {
  const response = await request.get("/api/pay-sh-skills");

  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe(
    "public, max-age=43200, stale-while-revalidate=86400",
  );
});
