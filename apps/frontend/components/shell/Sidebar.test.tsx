import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/image", () => ({
  default: ({
    alt,
    priority: _priority,
    ...props
  }: React.ComponentProps<"img"> & { priority?: boolean }) => <img alt={alt ?? ""} {...props} />,
}));

mock.module("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

mock.module("next/navigation", () => ({
  usePathname: () => "/providers",
}));

mock.module("@/app/providers", () => ({
  useProviders: () => ({
    stored: [],
    userProviders: [],
    hydrated: true,
    demoOpted: false,
  }),
}));

mock.module("@/components/ui/Icon", () => ({
  Icon: {
    provider: () => <span>provider</span>,
    customers: () => <span>customers</span>,
    bolt: () => <span>bolt</span>,
    spark: () => <span>spark</span>,
    geo: () => <span>geo</span>,
    external: () => <span>external</span>,
  },
}));

mock.module("@/components/shell/ProviderAvatar", () => ({
  ProviderAvatar: () => <span>avatar</span>,
}));

mock.module("@/lib/pay-sh/brand", () => ({
  inferBrandDisplayName: () => undefined,
  inferBrandDomain: () => ({ domain: undefined, iconUrl: undefined }),
}));

mock.module("@/lib/pay-sh/skills", () => ({
  resolvePaySkill: () => undefined,
  usePaySkills: () => [],
}));

mock.module("@/lib/providers", () => ({
  findProviderByRouteId: () => undefined,
  isDemoProvider: () => false,
}));

mock.module("@/lib/sdk-fixtures/shared", () => ({
  SDK_DEMO_PROVIDER_ID: "sdk-demo",
  SDK_DEMO_PROVIDER_NAME: "Northwind Price API",
}));

describe("Sidebar", () => {
  test("renders the commercial analytics brand label", async () => {
    const { Sidebar } = await import("./Sidebar");
    const html = renderToStaticMarkup(
      <Sidebar activeProviderId={undefined} activeRoute={undefined} dataMode="onChainOnly" />,
    );

    expect(html).toContain("Commercial Analytics");
    expect(html).not.toContain("Agent Payments");
  });
});
