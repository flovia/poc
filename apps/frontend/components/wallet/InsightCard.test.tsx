import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InsightCard } from "./InsightCard";

describe("InsightCard", () => {
  test("opts into stretch-friendly card layout for equal-height rows", () => {
    const html = renderToStaticMarkup(
      <InsightCard label="Demo" stretch>
        <div>content</div>
      </InsightCard>,
    );

    expect(html).toContain(
      "padding:18px;border-color:var(--line-strong);animation-delay:0ms;display:flex;flex-direction:column;height:100%;min-width:0",
    );
  });
});
