import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RecencyMatrixChart } from "./RecencyMatrixChart";

describe("RecencyMatrixChart", () => {
  test("uses an internal flex layout so the 2x2 matrix stays inside the card body", () => {
    const html = renderToStaticMarkup(
      <RecencyMatrixChart
        matrix={{
          totalWallets: 165,
          lastSeenMedian: 1_778_234_617,
          spendMedianAtomic: "30000",
          cells: {
            recentHigh: 48,
            recentLow: 35,
            staleHigh: 40,
            staleLow: 42,
          },
        }}
      />,
    );

    expect(html).toContain("display:flex;flex-direction:column;gap:10px;height:100%;min-height:0");
    expect(html).toContain("display:grid;grid-template-columns:1fr 1fr");
    expect(html).toContain("flex:1 1 0%;min-height:0");
    expect(html).not.toContain("margin-bottom:10px");
  });
});
