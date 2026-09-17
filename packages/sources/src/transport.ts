export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const ensureFetch = (fn?: FetchLike): FetchLike => fn ?? ((url, init) => fetch(url, init));

export const readPath = (value: unknown, path: string[]): unknown => {
  let cur = value;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
};
