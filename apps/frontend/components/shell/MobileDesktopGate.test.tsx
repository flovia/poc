import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isMobileUserAgent, MobileDesktopGate } from "./MobileDesktopGate";

describe("MobileDesktopGate", () => {
  test("detects common mobile user agents", () => {
    expect(
      isMobileUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      ),
    ).toBe(true);
    expect(
      isMobileUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/121.0 Mobile Safari/537.36",
      ),
    ).toBe(true);
  });

  test("does not detect desktop user agents as mobile", () => {
    expect(
      isMobileUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/121.0 Safari/537.36",
      ),
    ).toBe(false);
  });

  test("renders desktop-only guidance and landing page CTA on mobile", () => {
    const html = renderToStaticMarkup(<MobileDesktopGate landingUrl="https://example.com" />);

    expect(html).toContain("Flovia is built for desktop analytics");
    expect(html).toContain("/logo.png");
    expect(html).not.toContain("Desktop workspace");
    expect(html).not.toContain("Copy desktop link");
    expect(html).not.toContain("Tip:");
    expect(html).toContain("View Flovia Overview");
    expect(html).toContain("↗");
    expect(html).toContain("https://example.com");
  });
});
