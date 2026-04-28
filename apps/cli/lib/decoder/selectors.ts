import { EXECUTE_WITH_AUTHORIZATION_SELECTOR, MULTICALL3_AGGREGATE3_SELECTOR, TRANSFER_WITH_AUTHORIZATION_SELECTOR } from "../constants";
import type { KnownMethodSelector } from "../constants";

export const isHexData = (value: string): value is `0x${string}` => /^0x[0-9a-fA-F]*$/.test(value);

export const extractTopLevelSelector = (data: string): string | null => {
  if (!isHexData(data) || data.length < 10) return null;
  const selector = data.slice(0, 10).toLowerCase();
  return selector;
};

export const isKnownSelector = (selector: string): selector is KnownMethodSelector => {
  return (
    selector === TRANSFER_WITH_AUTHORIZATION_SELECTOR ||
    selector === EXECUTE_WITH_AUTHORIZATION_SELECTOR ||
    selector === MULTICALL3_AGGREGATE3_SELECTOR
  );
};

export const selectorLabel = (selector: string): "transferWithAuthorization" | "executeWithAuthorization" | "aggregate3" | "unknown" => {
  if (selector === TRANSFER_WITH_AUTHORIZATION_SELECTOR) return "transferWithAuthorization";
  if (selector === EXECUTE_WITH_AUTHORIZATION_SELECTOR) return "executeWithAuthorization";
  if (selector === MULTICALL3_AGGREGATE3_SELECTOR) return "aggregate3";
  return "unknown";
};
