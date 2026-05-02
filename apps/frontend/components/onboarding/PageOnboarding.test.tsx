import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WalletProfileOnboardingVisual } from "./PageOnboarding";

describe("WalletProfileOnboardingVisual", () => {
  test("renders the wallet profile mini visual without static images", () => {
    const html = renderToStaticMarkup(<WalletProfileOnboardingVisual />);

    expect(html).toContain("0x15c3...bc2b");
    expect(html).toContain("Wallet profile →");
    expect(html).toContain("Click for detail analytics");
    expect(html).toContain("Spend history");
    expect(html).toContain("AI agent context");
    expect(html).toContain("SDK-reported agent metadata");
    expect(html).not.toContain("agent type and top endpoint");
    expect(html).toContain("Providers");
    expect(html).toContain("Wallet profile");
    expect(html).not.toContain("<img");
  });
});
