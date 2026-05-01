import type { CustomerProviderUsageDto } from "@/lib/api/types";

export type CoUsageEndpoint = {
  providerId: string;
  name: string;
  path: string;
  payToWallet: string;
  spendAtomic: string;
  transactionCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
};

export type CoUsageHostGroup = {
  host: string;
  endpoints: CoUsageEndpoint[];
  transactionCount: number;
  spendAtomic: string;
  firstSeenAt: number;
  lastSeenAt: number;
};

export function extractHost(nameOrUrl: string): string {
  if (!nameOrUrl) return "(unknown)";
  try {
    return new URL(nameOrUrl).host;
  } catch {
    const slashIdx = nameOrUrl.indexOf("/");
    return slashIdx > 0 ? nameOrUrl.slice(0, slashIdx) : nameOrUrl;
  }
}

export function extractPath(nameOrUrl: string): string {
  if (!nameOrUrl) return "/";
  try {
    const url = new URL(nameOrUrl);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    const slashIdx = nameOrUrl.indexOf("/");
    return slashIdx > 0 ? nameOrUrl.slice(slashIdx) : "/";
  }
}

function minTimestamp(left: number, right: number): number {
  if (left <= 0) return right;
  if (right <= 0) return left;
  return Math.min(left, right);
}

export function groupProvidersByHost(providers: CustomerProviderUsageDto[]): CoUsageHostGroup[] {
  const byHost = new Map<string, CoUsageHostGroup>();

  for (const provider of providers) {
    const host = extractHost(provider.name);
    const endpoint: CoUsageEndpoint = {
      providerId: provider.providerId,
      name: provider.name,
      path: extractPath(provider.name),
      payToWallet: provider.payToWallet,
      spendAtomic: provider.spendAtomic,
      transactionCount: provider.transactionCount,
      firstSeenAt: provider.firstSeenAt,
      lastSeenAt: provider.lastSeenAt,
    };

    const current = byHost.get(host);
    if (!current) {
      byHost.set(host, {
        host,
        endpoints: [endpoint],
        transactionCount: endpoint.transactionCount,
        spendAtomic: endpoint.spendAtomic,
        firstSeenAt: endpoint.firstSeenAt,
        lastSeenAt: endpoint.lastSeenAt,
      });
      continue;
    }

    current.endpoints.push(endpoint);
    current.transactionCount += endpoint.transactionCount;
    current.spendAtomic = (BigInt(current.spendAtomic) + BigInt(endpoint.spendAtomic)).toString();
    current.firstSeenAt = minTimestamp(current.firstSeenAt, endpoint.firstSeenAt);
    current.lastSeenAt = Math.max(current.lastSeenAt, endpoint.lastSeenAt);
  }

  const groups = Array.from(byHost.values());
  for (const group of groups) {
    group.endpoints.sort(byTransactionCountDesc);
  }
  groups.sort(byTransactionCountDesc);
  return groups;
}

function byTransactionCountDesc<T extends { transactionCount: number }>(left: T, right: T): number {
  return right.transactionCount - left.transactionCount;
}
