import { describe, expect, test } from "bun:test";
import { ProvidersContextProvider } from "@/app/providers";
import { PROTAGONIST_PROFILE } from "@/lib/sdk-fixtures/protagonist";
import { renderToStaticMarkup } from "react-dom/server";
import { WalletScreen } from "./WalletScreen";

function renderWalletScreen() {
  return renderToStaticMarkup(
    <ProvidersContextProvider>
      <WalletScreen
        profile={PROTAGONIST_PROFILE}
        providerId="northwind-price"
        dataMode="onChainOnly"
        sdkExtras={null}
        sdkForceNetwork={null}
      />
    </ProvidersContextProvider>,
  );
}

describe("WalletScreen", () => {
  test("uses a page-level grid and a split identity header", () => {
    const html = renderWalletScreen();

    expect(html).toContain('data-testid="wallet-screen-grid"');
    expect(html).toContain('class="wallet-screen-grid"');
    expect(html).toContain('class="wallet-identity-grid"');
    expect(html).toContain('class="wallet-identity-main"');
    expect(html).toContain('class="wallet-identity-spend"');
  });

  test("pairs upsell and workflow intent before the stacked co-usage and timeline rows", () => {
    const html = renderWalletScreen();

    const supportStart = html.indexOf('aria-label="Wallet supporting summaries"');
    const evidenceAreaStart = html.indexOf('aria-label="Wallet evidence area"');
    const upsellStart = html.indexOf('aria-label="Wallet upsell opportunity"');
    const workflowIntentStart = html.indexOf('data-testid="wallet-evidence-workflow-intent"');
    const coUsageStart = html.indexOf('data-testid="wallet-evidence-co-usage"');
    const timelineStart = html.indexOf('data-testid="wallet-evidence-timeline"');

    expect(supportStart).toBeGreaterThanOrEqual(0);
    expect(evidenceAreaStart).toBeGreaterThan(supportStart);
    expect(upsellStart).toBeGreaterThan(evidenceAreaStart);
    expect(workflowIntentStart).toBeGreaterThan(upsellStart);
    expect(coUsageStart).toBeGreaterThan(workflowIntentStart);
    expect(timelineStart).toBeGreaterThan(coUsageStart);
    expect(html).toContain('class="wallet-screen-span-12 wallet-support-grid"');
    expect(html).toContain('class="wallet-screen-span-12 wallet-evidence-grid"');

    const supportSection = html.slice(supportStart, evidenceAreaStart);
    const evidenceSection = html.slice(evidenceAreaStart, timelineStart + 720);
    const upsellSection = html.slice(upsellStart, workflowIntentStart);
    const workflowIntentSection = html.slice(workflowIntentStart, coUsageStart);
    const coUsageSection = html.slice(coUsageStart, timelineStart);
    const timelineSection = html.slice(timelineStart, timelineStart + 720);

    const workflowIndex = supportSection.indexOf("Workflow position");
    const recentIndex = supportSection.indexOf("Recent activity &amp; co-usage");
    const opportunityIndex = supportSection.indexOf("Hourly trading loop detected");

    expect(workflowIndex).toBeGreaterThanOrEqual(0);
    expect(recentIndex).toBeGreaterThan(workflowIndex);
    expect(opportunityIndex).toBeGreaterThan(recentIndex);
    expect(supportSection).not.toContain("Upsell opportunity");
    expect(upsellSection).toContain(
      'class="wallet-screen-span-6 wallet-grid-item wallet-evidence-upsell"',
    );
    expect(workflowIntentSection).toContain(
      'data-testid="wallet-evidence-workflow-intent" class="wallet-screen-span-6 wallet-grid-item wallet-evidence-workflow-intent"',
    );
    expect(evidenceSection).toContain(
      'data-testid="wallet-evidence-co-usage" class="wallet-screen-span-12 wallet-grid-item wallet-evidence-co-usage"',
    );
    expect(evidenceSection).toContain(
      'data-testid="wallet-evidence-timeline" class="wallet-screen-span-12 wallet-grid-item wallet-evidence-timeline"',
    );
    expect(upsellSection).toContain("Upsell opportunity");
    expect(upsellSection).toContain("Heuristic inputs");
    expect(workflowIntentSection).toContain("Workflow intent");
    expect(coUsageSection).toContain("Co-usage map");
    expect(timelineSection).toContain("Activity timeline");
  });

  test("keeps co-usage above activity timeline in the stacked evidence flow", () => {
    const html = renderWalletScreen();

    const upsellStart = html.indexOf('aria-label="Wallet upsell opportunity"');
    const coUsageStart = html.indexOf('data-testid="wallet-evidence-co-usage"');
    const timelineStart = html.indexOf('data-testid="wallet-evidence-timeline"');

    expect(upsellStart).toBeGreaterThanOrEqual(0);
    expect(coUsageStart).toBeGreaterThan(upsellStart);
    expect(coUsageStart).toBeGreaterThanOrEqual(0);
    expect(timelineStart).toBeGreaterThan(coUsageStart);

    const coUsageSection = html.slice(coUsageStart, timelineStart);
    const timelineSection = html.slice(timelineStart, timelineStart + 480);

    expect(coUsageSection).toContain(
      'class="wallet-screen-span-12 wallet-grid-item wallet-evidence-co-usage"',
    );
    expect(coUsageSection).toContain("Co-usage map");
    expect(timelineSection).toContain(
      'class="wallet-screen-span-12 wallet-grid-item wallet-evidence-timeline"',
    );
    expect(timelineSection).toContain("Activity timeline");
  });

  test("uses the same neutral border tone as the header card", () => {
    const html = renderWalletScreen();

    expect(html).not.toContain("border-color:var(--signal-priority)");
    expect(html).not.toContain("border-color:rgba(47, 93, 154, 0.28)");
  });
});
