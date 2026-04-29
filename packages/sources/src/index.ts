export * from "./cdp-discovery";
export * from "./bitquery";

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
