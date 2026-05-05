export type AtlasOffer = {
  protocol: "x402" | "MPP";
  chain: string;
  asset: string;
  payTo: string;
  probePriceUsd: number;
};

export type AtlasProvider = {
  fqn: string;
  title: string;
  category: string;
  serviceUrl: string;
  description: string;
  useCase: string;
  endpointCount: number;
  priceRangeUsd?: { min: number; max: number };
  offers: AtlasOffer[];
};

export type ParsedAtlas = {
  providers: AtlasProvider[];
};

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
};

const stripBackticks = (value: string): string => value.replace(/^`|`$/g, "").trim();

const stripAngleUrl = (value: string): string => {
  const match = value.match(/^<(.+)>$/);
  return match ? (match[1] as string) : value;
};

const parsePriceRange = (raw: string): { min: number; max: number } | undefined => {
  if (!raw || raw === "—" || raw === "-") return undefined;
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const dashSplit = cleaned.split(/\s*[–-]\s*/);
  const parsedNumbers = dashSplit.map((token) => Number.parseFloat(token));
  if (parsedNumbers.some((n) => Number.isNaN(n))) return undefined;
  if (parsedNumbers.length === 1 && typeof parsedNumbers[0] === "number") {
    return { min: parsedNumbers[0], max: parsedNumbers[0] };
  }
  const min = Math.min(...parsedNumbers);
  const max = Math.max(...parsedNumbers);
  return { min, max };
};

const parseDescriptionTable = (md: string): Map<string, Omit<AtlasProvider, "offers">> => {
  const lines = md.split("\n");
  const startIdx = lines.findIndex((l) => l.startsWith("## Provider descriptions"));
  if (startIdx === -1) throw new Error("description table not found");
  const map = new Map<string, Omit<AtlasProvider, "offers">>();

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line.startsWith("---") || line.startsWith("## ")) break;
    const cells = splitTableRow(line);
    if (cells.length !== 8) continue;
    const fqn = stripBackticks(cells[0] as string);
    if (!fqn || fqn === "Provider (fqn)" || fqn.startsWith("---")) continue;

    const endpointsRaw = (cells[6] as string) || "0";
    const priceRaw = (cells[7] as string) || "";

    map.set(fqn, {
      fqn,
      title: cells[1] as string,
      category: cells[2] as string,
      serviceUrl: stripAngleUrl(cells[3] as string),
      description: cells[4] as string,
      useCase: cells[5] as string,
      endpointCount: Number.parseInt(endpointsRaw, 10) || 0,
      priceRangeUsd: parsePriceRange(priceRaw),
    });
  }

  return map;
};

const parsePaymentTable = (md: string): Map<string, AtlasOffer[]> => {
  const lines = md.split("\n");
  const startIdx = lines.findIndex((l) => l.startsWith("## Per-provider payment table"));
  if (startIdx === -1) throw new Error("payment table not found");
  const map = new Map<string, AtlasOffer[]>();

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line.startsWith("---") || line.startsWith("## ")) break;
    const cells = splitTableRow(line);
    if (cells.length !== 8) continue;
    const fqn = stripBackticks(cells[0] as string);
    if (!fqn || fqn === "Provider (fqn)" || fqn.startsWith("---")) continue;

    const protocol = cells[3] as string;
    const chain = cells[4] as string;
    const asset = cells[5] as string;
    const payToRaw = stripBackticks(cells[6] as string);
    const probePriceRaw = (cells[7] as string) || "";

    if (protocol === "—" || payToRaw.startsWith("_no challenge")) {
      continue;
    }

    if (protocol !== "x402" && protocol !== "MPP") continue;

    const probePrice = Number.parseFloat(probePriceRaw);
    const offer: AtlasOffer = {
      protocol,
      chain,
      asset,
      payTo: payToRaw,
      probePriceUsd: Number.isNaN(probePrice) ? 0 : probePrice,
    };

    const list = map.get(fqn) ?? [];
    list.push(offer);
    map.set(fqn, list);
  }

  return map;
};

export const parsePayskillsAtlas = (md: string): ParsedAtlas => {
  const descriptions = parseDescriptionTable(md);
  const offers = parsePaymentTable(md);

  const providers: AtlasProvider[] = [];
  for (const [fqn, desc] of descriptions) {
    const fqnOffers = offers.get(fqn);
    if (!fqnOffers || fqnOffers.length === 0) continue;
    providers.push({ ...desc, offers: fqnOffers });
  }
  return { providers };
};
