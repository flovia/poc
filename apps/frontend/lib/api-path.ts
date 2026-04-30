import type { StoredProvider } from "@/lib/types";

// payTo (BFF DTO 由来) を、ユーザーが Setup の advanced モードで登録した
// StoredProvider.paths[].payTo と突き合わせ、紐付く apiPath を全件返す。
// BFF は API path を提供しないので、フロントの localStorage マッピングだけで
// 解決している。simple モードの Provider は paths[] を持たないので skip。
export function resolveApiPaths(payTo: string, providers: StoredProvider[]): string[] {
  const target = payTo.toLowerCase();
  const matches: string[] = [];

  for (const provider of providers) {
    if (provider.mode !== "advanced") continue;
    for (const path of provider.paths) {
      if (path.payTo.toLowerCase() === target) {
        matches.push(path.apiPath);
      }
    }
  }

  return Array.from(new Set(matches));
}
