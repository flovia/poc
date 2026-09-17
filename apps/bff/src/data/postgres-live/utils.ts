export const normalizePaymentAddressForNetwork = (value: unknown, network: string): string => {
  const raw = String(value ?? "");
  return network.toLowerCase() === "base" ? raw.toLowerCase() : raw;
};
