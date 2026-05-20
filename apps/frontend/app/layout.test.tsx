import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/font/google", () => {
  const font = ({ variable }: { variable: string }) => ({ variable });
  return {
    Geist: font,
    Geist_Mono: font,
    Space_Grotesk: font,
  };
});

mock.module("next/headers", () => ({
  headers: () => ({
    get: () =>
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/121.0 Safari/537.36",
  }),
}));

mock.module("@vercel/analytics/next", () => ({
  Analytics: () => <span data-testid="vercel-analytics" />,
}));

describe("RootLayout", () => {
  test("renders Vercel Analytics on desktop pages", async () => {
    const { default: RootLayout } = await import("./layout");
    const layout = await RootLayout({ children: <main>Dashboard</main> });
    const html = renderToStaticMarkup(layout);

    expect(html).toContain("Dashboard");
    expect(html).toContain('data-testid="vercel-analytics"');
  });
});
