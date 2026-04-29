import fs from "node:fs";
import path from "node:path";
import { validateEndpointManifest } from "../../../lib/endpoint-manifest";

type EndpointCaseRecord = Record<string, unknown>;

const manifestPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "endpoint_manifest.json");

const bodyTemplates: Record<string, unknown> = {
  "spcat-agentmail-endp_d6krn581b0vmrys94-route-0": {
    name: "flovia-probe-pod",
    client_id: "flovia-probe",
  },
  "spcat-agentmail-endp_d6krn58sdbsjt494g-route-0": {
    url: "https://example.com/webhook",
    event_types: ["message.received"],
  },
  "spcat-alchemy-endp_d6gf1dr34cyasjf2g-route-0": {
    symbol: "ETH",
    startTime: "2024-01-01T00:00:00Z",
    endTime: "2024-01-02T00:00:00Z",
  },
  "spcat-alchemy-endp_d6gf1draejxtpexz8-route-0": {
    addresses: [
      { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", networks: ["eth-mainnet"] },
    ],
  },
  "spcat-alchemy-endp_d6gf1drfbh3aeeh28-route-0": {
    addresses: [{ network: "eth-mainnet", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }],
  },
  "spcat-alchemy-endp_d6gf1drmybrj5sgq4-route-0": {
    addresses: [
      { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", networks: ["eth-mainnet"] },
    ],
  },
  "spcat-alchemy-endp_d6gf1drrz6y74ec28-route-0": {
    addresses: [
      { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", networks: ["eth-mainnet"] },
    ],
  },
  "spcat-alchemy-endp_d6gf1drx1f1bbcb7r-route-0": {
    addresses: [
      { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", networks: ["eth-mainnet"] },
    ],
  },
  "spcat-alchemy-endp_d6gf1drx2q1gbmz10-route-0": {
    addresses: [
      { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", networks: ["eth-mainnet"] },
    ],
  },
  "spcat-allium-endp_d6dt2501qbef2t8tm-route-0": [
    { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "ethereum" },
  ],
  "spcat-allium-endp_d6dt250hqhgthgry8-route-0": [
    { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "ethereum" },
  ],
  "spcat-allium-endp_d6dt250n5n8rmwrk4-route-0": [
    { chain: "ethereum", token_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  ],
  "spcat-allium-endp_d6dt250nb7vqf3b2c-route-0": [
    { chain: "ethereum", token_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  ],
  "spcat-allium-endp_d6dt250szcfs7na3r-route-0": [
    { chain: "ethereum", token_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  ],
  "spcat-allium-endp_d6dt250vaq88fdz6g-route-0": [
    { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "ethereum" },
  ],
  "spcat-apollo-endp_d6dt258gv7esnfbdw-route-0": { q_organization_name: "Apollo" },
  "spcat-apollo-endp_d6dt258n5yq2em8w4-route-0": {
    first_name: "Tim",
    last_name: "Cook",
    organization_name: "Apple",
  },
  "spcat-apollo-endp_d6dt258pb4ygf421w-route-0": {
    details: [{ first_name: "Tim", last_name: "Cook", organization_name: "Apple" }],
  },
  "spcat-apollo-endp_d6dt258wqhc4m68jm-route-0": { q_keywords: "founder", page: 1, per_page: 10 },
  "spcat-exa-endp_d6dt25gr6m2pv34mw-route-0": { urls: ["https://example.com"], text: true },
  "spcat-nansen-endp_d6ef1g0zx136w74jr-route-0": {
    chains: ["ethereum"],
    min_market_cap: 1_000_000,
    max_market_cap: 1_000_000_000,
    min_volume: 100_000,
    limit: 10,
  },
  "spcat-nyne-endp_d6dt25r3ksxxs6gn8-route-0": { email: "satya@microsoft.com" },
  "spcat-nyne-endp_d6dt25rgazs9fr3dw-route-0": {
    company_name: "Microsoft",
    role: "CEO",
    person_name: "Satya Nadella",
    page: 1,
    page_size: 10,
  },
  "spcat-openrouter-endp_d6dt25g1hh38s0tf0-route-0": {
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: "Say hello in one short sentence." }],
  },
  "spcat-openrouter-endp_d6dt25g9hhg1p5hjr-route-0": {
    model: "openai/gpt-4o-mini",
    max_tokens: 16,
    messages: [{ role: "user", content: "Hello" }],
  },
  "spcat-openrouter-endp_d6dt25gebfw60f440-route-0": {
    model: "openai/gpt-4o-mini",
    prompt: "Say hello.",
    max_tokens: 16,
  },
  "spcat-openrouter-endp_d6dt25gejd5m69a4r-route-0": {
    model: "openai/text-embedding-3-small",
    input: "hello world",
  },
  "spcat-openrouter-endp_d6dt25gen10rseewr-route-0": {
    model: "openai/gpt-4o-mini",
    input: "Say hello in one short sentence.",
  },
  "spcat-orca-whirlpools-endp_d7emhtr3kvky8egy8-route-0": {
    position_mint: "11111111111111111111111111111111",
    wallet_address: "11111111111111111111111111111111",
    withdraw_percent: 1,
    slippage_bps: 100,
  },
  "spcat-orca-whirlpools-endp_d7emhtryk4g1vqy7w-route-0": {
    token_a: "So11111111111111111111111111111111111111112",
    token_b: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    wallet_address: "11111111111111111111111111111111",
    usd_amount: 1,
    slippage_bps: 100,
  },
  "spcat-orca-whirlpools-endp_d7emhv02vxpyj4cvm-route-0": {
    token_a: "So11111111111111111111111111111111111111112",
    token_b: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    lower_price: 100,
    upper_price: 300,
    token_a_amount: "0.01",
    slippage_bps: 100,
  },
  "spcat-orca-whirlpools-endp_d7emhv0554vd4vxnm-route-0": {
    wallet_address: "11111111111111111111111111111111",
    lower_tick: -100,
    upper_tick: 100,
    liquidity: "1",
    token_a_max: "1",
    token_b_max: "1",
  },
  "spcat-reducto-endp_d6dt25r3wagz5xvtr-route-0": {
    document_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  "spcat-reducto-endp_d6fpnfr461nqza2v8-route-0": {
    input: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    instructions: { schema: { type: "object", properties: { title: { type: "string" } } } },
  },
};

const resourceUrls: Record<string, string> = {
  "spcat-alchemy-endp_d6gf1drx65936g4hg-route-0":
    "https://x402.alchemy.com/prices/v1/tokens/by-symbol?symbols=ETH",
  "spcat-allium-endp_d6dt250q5zgcm6wfw-route-0":
    "https://agents.allium.so/api/v1/developer/tokens/search?q=USDC",
  "spcat-auor-endp_d6dt258ttt4m5s5yc-route-0":
    "https://api.auor.io/google-maps/v1/search/full?query=coffee%20shops%20in%20New%20York&language=en&region=us",
  "spcat-auor-endp_d6f8th80539ahj3pr-route-0":
    "https://api.auor.io/all-rates-today/v1/rates?source=USD&target=EUR",
  "spcat-auor-endp_d6f8th87yjk1xscxc-route-0": "https://api.auor.io/ip-stack/v1/lookup?ip=8.8.8.8",
  "spcat-auor-endp_d6f8th8jjvxnpfvyc-route-0":
    "https://api.auor.io/all-rates-today/v1/historical?source=USD&target=EUR&period=7d",
  "spcat-auor-endp_d6f8th8yc1ebxxadr-route-0":
    "https://api.auor.io/amadeus/v1/search?origin=NYC&destination=LAX&dateDepart=2026-06-01&travelersAdult=1",
  "spcat-coinmarketcap-endp_d6k2xqrmfr5r93trg-route-0":
    "https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/quotes/latest?symbol=BTC",
  "spcat-coinmarketcap-endp_d6k2xqrz98g5be828-route-0":
    "https://pro-api.coinmarketcap.com/x402/v4/dex/pairs/quotes/latest?contract_address=0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc&network_slug=ethereum",
  "spcat-dome-endp_d6dt25g4h9mp3s87c-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d5y7k40sm2ntn45xr/polymarket/wallet?address=0x0000000000000000000000000000000000000000",
  "spcat-dome-endp_d6dt25g66az2rv8r4-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d5y7k40sm2ntn45xr/matching-markets/sports?sport=soccer",
  "spcat-dome-endp_d6dt25gnhc2ggf41w-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d5y7k40sm2ntn45xr/polymarket/activity?limit=10&offset=0",
  "spcat-dome-endp_d6dt25gr1jmgwkfkm-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d5y7k40sm2ntn45xr/kalshi/orderbooks?ticker=KXBTCD-26APR28-B76000",
  "spcat-dome-endp_d6dt25grf89cyanj4-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d5y7k40sm2ntn45xr/polymarket/orderbooks?token_id=0",
  "spcat-nyne-endp_d6dt25rj4a8gqh91m-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d5ymfernpzeh58gb8/person/enrichment?requestId=probe",
  "spcat-orca-whirlpools-endp_d7emhv0hhef6tb6xw-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d6y9cggxhd3pcq41m/v1/pools/search?q=SOL-USDC",
  "spcat-rug-pull-detector-endp_d7ekf7gc4g0v9vnkm-route-0":
    "https://api.paysponge.com/x402/purchase/svc_d6tc4d89rramggb4m/search?name=USDC&chain=base",
};

const filePath = manifestPath();
const manifest = JSON.parse(fs.readFileSync(filePath, "utf8")) as { cases: EndpointCaseRecord[] };
let bodyCount = 0;
let urlCount = 0;

for (const endpointCase of manifest.cases) {
  const caseId = String(endpointCase.caseId ?? "");
  const body = bodyTemplates[caseId];
  if (body !== undefined) {
    endpointCase.requestBodyTemplate = body;
    bodyCount += 1;
  }
  const resourceUrl = resourceUrls[caseId];
  if (resourceUrl !== undefined) {
    endpointCase.resourceUrl = resourceUrl;
    endpointCase.requestHost = new URL(resourceUrl).host;
    urlCount += 1;
  }
}

const nextManifest = validateEndpointManifest(manifest);
fs.writeFileSync(filePath, `${JSON.stringify(nextManifest, null, 2)}\n`);

console.log(JSON.stringify({ status: "ok", bodyCount, urlCount }, null, 2));
