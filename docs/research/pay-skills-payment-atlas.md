# pay-skills Provider Payment Atlas

Captured by direct HTTP probe of each provider's first paid endpoint listed in `https://storage.googleapis.com/pay-skills/v1/skills.json`. Every row below was decoded from a real 402 challenge returned by the provider's HTTPS service — no registry-side data is presented as a fact unless it appears in a saved raw response.

- Generated: 2026-05-04T21:57:28Z
- Source index: `https://storage.googleapis.com/pay-skills/v1/skills.json` (66 providers)
- Probe method: unauthenticated `curl` against `<service_url>/<first paid endpoint>`. **All** `payment-required` (x402) and **all** `WWW-Authenticate: Payment` (MPP) headers in the response are decoded — providers commonly emit one `WWW-Authenticate` per accepted token (USDC/USDT/CASH).
- Sample size per provider: **1 endpoint**. Within a provider, `payTo` and accepted networks/assets are constant across endpoints (verified on `agentmail/email`); only `amount` varies. Different endpoints can occasionally drop networks (e.g., one endpoint of `agentmail/email` exposes only Solana+Base+Avalanche while another adds X Layer).

## Verification

- Raw HTTP responses for every probe are saved under `/tmp/pay-skills/raw/<fqn>.txt` (66 files). Tables in this document can be recomputed from those files alone.
- HTTP status distribution observed in the probes: `402`×53, `400`×7, `None`×2, `301`×1, `500`×1, `404`×1, `200`×1.
- Spot-check (re-run during reproduction):
  - `merit-systems/stableenrich/enrichment` → re-probed; payTo `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` (Base) and `6cvgmdrsVxyiuPzqMCSBnS7fAmA5Mk2VG4BcfVhC8jdC` (Solana) match the table below.
  - `agentmail/email` → re-probed; all 4 networks (Base / Solana / Avalanche / X Layer) match.
  - `solana-foundation/alibaba/agentexplorer` → re-probed; recipient `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` matches across all three token variants (USDC/USDT/CASH).
- **Not** verified by this document: (a) on-chain existence/ownership of the recipient accounts, (b) that listed asset addresses are actually canonical USDC/USDT/CASH (label is derived by exact-match against a hard-coded registry of known stablecoin addresses), (c) that providers do not rotate `payTo` between probes.

## Summary

- **Providers in registry**: 66
- **Providers returning a usable challenge**: 53
- **Providers without a challenge** (auth required, schema validation, redirect, etc.): 13
- **Providers offering Solana mainnet** (x402 + MPP combined): 53
- **Protocols seen**: x402 (12 providers) · MPP (47 providers)
- **Total payment offers** (one per network × token combination): 175

### Chains observed

| Chain | Provider count | Distinct payTo addresses | Total offers |
|-------|---------------:|-------------------------:|-------------:|
| Solana mainnet (MPP) | 41 | 1 | 123 |
| Base | 11 | 10 | 13 |
| Solana mainnet | 12 | 11 | 13 |
| Tempo | 6 | 6 | 6 |
| X Layer | 2 | 2 | 3 |
| Base Sepolia (testnet) | 1 | 1 | 3 |
| Polygon Amoy (testnet) | 1 | 1 | 3 |
| Polygon | 1 | 1 | 3 |
| eip155:5042002 (unknown) | 1 | 1 | 3 |
| eip155:1952 (unknown) | 1 | 1 | 2 |
| Solana devnet (probable) | 1 | 1 | 2 |
| Avalanche | 1 | 1 | 1 |

### Assets observed (offer count, not provider count)

| Asset | Offers |
|-------|------:|
| USDC | 71 |
| USDT | 41 |
| CASH | 41 |
| USD (Tempo) | 6 |
| ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | 3 |
| ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | 3 |
| ERC20:0x3600000000000000000000000000000000000000 | 3 |
| ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | 2 |
| ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | 2 |
| SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | 2 |
| ERC20:0x74b7f16337b8972027f6196a17a631ac6de26d22 | 1 |

---

## Per-provider table

Each row is one challenge offer (network × asset × payTo). A provider that accepts USDC, USDT, and CASH on Solana via MPP appears in three rows; a provider with multi-network x402 also expands across rows.

| Provider (fqn) | Title | Category | Protocol | Chain | Asset | payTo | Probe price (USD) |
|----------------|-------|----------|----------|-------|-------|-------|------------------:|
| `agentmail/email` | AgentMail | messaging | x402 | Base | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` | 10.000000 |
| `agentmail/email` | AgentMail | messaging | x402 | Solana mainnet | USDC | `7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw` | 10.000000 |
| `agentmail/email` | AgentMail | messaging | x402 | Avalanche | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` | 10.000000 |
| `agentmail/email` | AgentMail | messaging | x402 | X Layer | ERC20:0x74b7f16337b8972027f6196a17a631ac6de26d22 | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` | 10.000000 |
| `crushrewards/pricing` | Crush Rewards | data | x402 | Solana mainnet | USDC | `2hYY7wHhXsoWnskQRzYFUNH7YboXNMEqbGnAFHpRuB2W` | 0.020000 |
| `crushrewards/pricing` | Crush Rewards | data | x402 | Base | USDC | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` | 0.020000 |
| `crushrewards/pricing` | Crush Rewards | data | MPP | Tempo | USD (Tempo) | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` | 0.020000 |
| `dtelecom/voice` | dTelecom | ai_ml | x402 | Base | USDC | `0x47d3394c7234714E4B9e9b74827c12bE847F9DDA` | 0.000000 |
| `dtelecom/voice` | dTelecom | ai_ml | x402 | Solana mainnet | USDC | `8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm` | 0.000000 |
| `merit-systems/stablecrypto/market-data` | StableCrypto | finance | x402 | Base | USDC | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` | 0.010000 |
| `merit-systems/stablecrypto/market-data` | StableCrypto | finance | x402 | Solana mainnet | USDC | `BX1v9we4BCt28GM3hWwfXwnXDXpYHKWMFcWaHNytnbNL` | 0.010000 |
| `merit-systems/stablecrypto/market-data` | StableCrypto | finance | MPP | Tempo | USD (Tempo) | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` | 0.010000 |
| `merit-systems/stabledomains/domains` | StableDomains | productivity | — | — | — | _no challenge (HTTP 400)_ | — |
| `merit-systems/stableemail/email` | StableEmail | messaging | x402 | Base | USDC | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` | 0.001000 |
| `merit-systems/stableemail/email` | StableEmail | messaging | x402 | Solana mainnet | USDC | `29XqFRpqRrXs8UjSsZnscqW3cTxNdY84qfaa9BGo3y4j` | 0.001000 |
| `merit-systems/stableemail/email` | StableEmail | messaging | MPP | Tempo | USD (Tempo) | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` | 0.001000 |
| `merit-systems/stableenrich/enrichment` | StableEnrich | data | x402 | Base | USDC | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` | 0.049500 |
| `merit-systems/stableenrich/enrichment` | StableEnrich | data | x402 | Solana mainnet | USDC | `6cvgmdrsVxyiuPzqMCSBnS7fAmA5Mk2VG4BcfVhC8jdC` | 0.049500 |
| `merit-systems/stableenrich/enrichment` | StableEnrich | data | MPP | Tempo | USD (Tempo) | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` | 0.049500 |
| `merit-systems/stablemerch/merchandise` | StableMerch | productivity | — | — | — | _no challenge (HTTP 400)_ | — |
| `merit-systems/stablephone/calls` | StablePhone | messaging | x402 | Base | USDC | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` | 0.050000 |
| `merit-systems/stablephone/calls` | StablePhone | messaging | x402 | Solana mainnet | USDC | `HgZtbsqE7MdPcUipeuiiNEMuLByDAXE4X9qrH1w6LdDz` | 0.050000 |
| `merit-systems/stablephone/calls` | StablePhone | messaging | MPP | Tempo | USD (Tempo) | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` | 0.050000 |
| `merit-systems/stablesocial/social-data` | StableSocial | media | x402 | Base | USDC | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` | 0.060000 |
| `merit-systems/stablesocial/social-data` | StableSocial | media | x402 | Solana mainnet | USDC | `Ab4tooTiV5tWj5tiYHnw2t2p4QHcYjEMd4ZboB8JpF5q` | 0.060000 |
| `merit-systems/stablesocial/social-data` | StableSocial | media | MPP | Tempo | USD (Tempo) | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` | 0.060000 |
| `merit-systems/stablestudio/media-generation` | StableStudio | media | — | — | — | _no challenge (HTTP 400)_ | — |
| `merit-systems/stableupload/hosting` | StableUpload | storage | — | — | — | _no challenge (HTTP 400)_ | — |
| `paysponge/perplexity` | Perplexity AI API | ai_ml | x402 | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` | 0.010000 |
| `paysponge/perplexity` | Perplexity AI API | ai_ml | x402 | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` | 0.010000 |
| `paysponge/rentcast` | RentCast API | data | x402 | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` | 0.010000 |
| `paysponge/rentcast` | RentCast API | data | x402 | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` | 0.010000 |
| `purch/marketplace` | Purch | productivity | x402 | Solana mainnet | USDC | `8LiXrHC61irY8qwj6qevoiRXxYfrTgSaHVbm8rav6HT2` | 0.010000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | X Layer | ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | X Layer | ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:1952 (unknown) | ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:1952 (unknown) | ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana devnet (probable) | SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana devnet (probable) | SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana mainnet | USDC | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana mainnet | USDC | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 0.001000 |
| `socialintel/influencer-search` | Social Intel | data | — | — | — | _no challenge (HTTP 301)_ | — |
| `solana-foundation/alibaba/agentexplorer` | Alibaba Cloud Agent Skills Explorer | search | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/agentexplorer` | Alibaba Cloud Agent Skills Explorer | search | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/agentexplorer` | Alibaba Cloud Agent Skills Explorer | search | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/aigen` | Alibaba Cloud AI Generation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/aigen` | Alibaba Cloud AI Generation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/aigen` | Alibaba Cloud AI Generation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/anytrans` | Alibaba Cloud AnyTrans | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/anytrans` | Alibaba Cloud AnyTrans | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/anytrans` | Alibaba Cloud AnyTrans | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/captcha` | Alibaba Cloud CAPTCHA | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/captcha` | Alibaba Cloud CAPTCHA | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/captcha` | Alibaba Cloud CAPTCHA | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth` | Alibaba Cloud Cloudauth | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth` | Alibaba Cloud Cloudauth | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth` | Alibaba Cloud Cloudauth | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth-intl` | Alibaba Cloud Cloudauth International | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth-intl` | Alibaba Cloud Cloudauth International | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth-intl` | Alibaba Cloud Cloudauth International | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/contactcenterai` | Alibaba Cloud Contact Center AI | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/contactcenterai` | Alibaba Cloud Contact Center AI | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/contactcenterai` | Alibaba Cloud Contact Center AI | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/documentparseservice` | Alibaba Cloud Document Parse Service | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/documentparseservice` | Alibaba Cloud Document Parse Service | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/documentparseservice` | Alibaba Cloud Document Parse Service | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/edututor` | Alibaba Cloud EduTutor | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/edututor` | Alibaba Cloud EduTutor | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/edututor` | Alibaba Cloud EduTutor | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/embeddings` | Alibaba Cloud Model Studio Embeddings | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000700 |
| `solana-foundation/alibaba/embeddings` | Alibaba Cloud Model Studio Embeddings | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000700 |
| `solana-foundation/alibaba/embeddings` | Alibaba Cloud Model Studio Embeddings | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000700 |
| `solana-foundation/alibaba/facebody` | Alibaba Cloud Facebody | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/facebody` | Alibaba Cloud Facebody | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/facebody` | Alibaba Cloud Facebody | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/farui` | Alibaba Cloud FaRui | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/farui` | Alibaba Cloud FaRui | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/farui` | Alibaba Cloud FaRui | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/goodstech` | Alibaba Cloud Goods Tech | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/goodstech` | Alibaba Cloud Goods Tech | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/goodstech` | Alibaba Cloud Goods Tech | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/green` | Alibaba Cloud Green | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/green` | Alibaba Cloud Green | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/green` | Alibaba Cloud Green | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageaudit` | Alibaba Cloud Image Audit | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageaudit` | Alibaba Cloud Image Audit | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageaudit` | Alibaba Cloud Image Audit | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imagerecog` | Alibaba Cloud Image Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imagerecog` | Alibaba Cloud Image Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imagerecog` | Alibaba Cloud Image Recognition | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageseg` | Alibaba Cloud Image Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageseg` | Alibaba Cloud Image Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageseg` | Alibaba Cloud Image Segmentation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Alibaba Cloud Intelligent Speech Interaction | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001400 |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Alibaba Cloud Intelligent Speech Interaction | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001400 |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Alibaba Cloud Intelligent Speech Interaction | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001400 |
| `solana-foundation/alibaba/iqs` | Alibaba Cloud Information Query Service | search | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/iqs` | Alibaba Cloud Information Query Service | search | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/iqs` | Alibaba Cloud Information Query Service | search | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ivpd` | Alibaba Cloud IVPD | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ivpd` | Alibaba Cloud IVPD | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ivpd` | Alibaba Cloud IVPD | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/machinetranslation` | Alibaba Cloud Machine Translation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/machinetranslation` | Alibaba Cloud Machine Translation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/machinetranslation` | Alibaba Cloud Machine Translation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/objectdet` | Alibaba Cloud Object Detection | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/objectdet` | Alibaba Cloud Object Detection | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/objectdet` | Alibaba Cloud Object Detection | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr` | Alibaba Cloud Model Studio OCR | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr` | Alibaba Cloud Model Studio OCR | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr` | Alibaba Cloud Model Studio OCR | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr-api` | Alibaba Cloud OCR API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr-api` | Alibaba Cloud OCR API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr-api` | Alibaba Cloud OCR API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/paimodelgallery` | Alibaba Cloud PAI Model Gallery | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/paimodelgallery` | Alibaba Cloud PAI Model Gallery | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/paimodelgallery` | Alibaba Cloud PAI Model Gallery | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/rai` | Alibaba Cloud Responsible AI | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/rai` | Alibaba Cloud Responsible AI | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/rai` | Alibaba Cloud Responsible AI | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/saf` | Alibaba Cloud SAF | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/saf` | Alibaba Cloud SAF | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/saf` | Alibaba Cloud SAF | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/speech` | Alibaba Cloud Model Studio Speech Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000035 |
| `solana-foundation/alibaba/speech` | Alibaba Cloud Model Studio Speech Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000035 |
| `solana-foundation/alibaba/speech` | Alibaba Cloud Model Studio Speech Recognition | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000035 |
| `solana-foundation/alibaba/texttospeech` | Alibaba Cloud Model Studio Text-to-Speech | ai_ml | — | — | — | _no challenge (HTTP 500)_ | — |
| `solana-foundation/alibaba/translate` | Alibaba Cloud Model Studio Translation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/translate` | Alibaba Cloud Model Studio Translation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/translate` | Alibaba Cloud Model Studio Translation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/viapi-ocr` | Alibaba Cloud OCR (VIAPI) | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/viapi-ocr` | Alibaba Cloud OCR (VIAPI) | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/viapi-ocr` | Alibaba Cloud OCR (VIAPI) | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoenhan` | Alibaba Cloud Video Enhancement | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoenhan` | Alibaba Cloud Video Enhancement | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoenhan` | Alibaba Cloud Video Enhancement | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videorecog` | Alibaba Cloud Video Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videorecog` | Alibaba Cloud Video Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videorecog` | Alibaba Cloud Video Recognition | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoseg` | Alibaba Cloud Video Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoseg` | Alibaba Cloud Video Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoseg` | Alibaba Cloud Video Segmentation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/addressvalidation` | Address Validation API | maps | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/addressvalidation` | Address Validation API | maps | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/addressvalidation` | Address Validation API | maps | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/airquality` | Air Quality API | maps | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/airquality` | Air Quality API | maps | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/airquality` | Air Quality API | maps | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/bigquery` | BigQuery API | data | — | — | — | _no challenge (HTTP 404)_ | — |
| `solana-foundation/google/civicinfo` | Google Civic Information API | search | — | — | — | _no challenge (HTTP 400)_ | — |
| `solana-foundation/google/documentai` |  |  | — | — | — | _no challenge (HTTP None)_ | — |
| `solana-foundation/google/factchecktools` | Fact Check Tools API | search | — | — | — | _no challenge (HTTP 400)_ | — |
| `solana-foundation/google/generativelanguage` | Generative Language API (Gemini) | ai_ml | — | — | — | _no challenge (HTTP 200)_ | — |
| `solana-foundation/google/kgsearch` | Knowledge Graph Search API | search | — | — | — | _no challenge (HTTP 400)_ | — |
| `solana-foundation/google/language` | Cloud Natural Language API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/language` | Cloud Natural Language API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/language` | Cloud Natural Language API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/places` | Places API (New) | maps | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/places` | Places API (New) | maps | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/places` | Places API (New) | maps | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/speech` | Cloud Speech-to-Text API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.016000 |
| `solana-foundation/google/speech` | Cloud Speech-to-Text API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.016000 |
| `solana-foundation/google/speech` | Cloud Speech-to-Text API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.016000 |
| `solana-foundation/google/texttospeech` | Cloud Text-to-Speech API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000030 |
| `solana-foundation/google/texttospeech` | Cloud Text-to-Speech API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000030 |
| `solana-foundation/google/texttospeech` | Cloud Text-to-Speech API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000030 |
| `solana-foundation/google/translate` |  |  | — | — | — | _no challenge (HTTP None)_ | — |
| `solana-foundation/google/videointelligence` | Cloud Video Intelligence API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.100000 |
| `solana-foundation/google/videointelligence` | Cloud Video Intelligence API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.100000 |
| `solana-foundation/google/videointelligence` | Cloud Video Intelligence API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.100000 |
| `solana-foundation/google/vision` | Cloud Vision API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001500 |
| `solana-foundation/google/vision` | Cloud Vision API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001500 |
| `solana-foundation/google/vision` | Cloud Vision API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001500 |

---

## Solana mainnet payment recipients (deduped)

12 unique Solana wallet addresses across 53 providers.

| Provider | Variant | Asset | payTo (Solana) |
|----------|---------|-------|----------------|
| `agentmail/email` | Solana mainnet | USDC | `7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw` |
| `crushrewards/pricing` | Solana mainnet | USDC | `2hYY7wHhXsoWnskQRzYFUNH7YboXNMEqbGnAFHpRuB2W` |
| `dtelecom/voice` | Solana mainnet | USDC | `8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm` |
| `merit-systems/stablecrypto/market-data` | Solana mainnet | USDC | `BX1v9we4BCt28GM3hWwfXwnXDXpYHKWMFcWaHNytnbNL` |
| `merit-systems/stableemail/email` | Solana mainnet | USDC | `29XqFRpqRrXs8UjSsZnscqW3cTxNdY84qfaa9BGo3y4j` |
| `merit-systems/stableenrich/enrichment` | Solana mainnet | USDC | `6cvgmdrsVxyiuPzqMCSBnS7fAmA5Mk2VG4BcfVhC8jdC` |
| `merit-systems/stablephone/calls` | Solana mainnet | USDC | `HgZtbsqE7MdPcUipeuiiNEMuLByDAXE4X9qrH1w6LdDz` |
| `merit-systems/stablesocial/social-data` | Solana mainnet | USDC | `Ab4tooTiV5tWj5tiYHnw2t2p4QHcYjEMd4ZboB8JpF5q` |
| `paysponge/perplexity` | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` |
| `paysponge/rentcast` | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` |
| `purch/marketplace` | Solana mainnet | USDC | `8LiXrHC61irY8qwj6qevoiRXxYfrTgSaHVbm8rav6HT2` |
| `quicknode/rpc` | Solana devnet (probable) | SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` |
| `quicknode/rpc` | Solana mainnet | USDC | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` |
| `solana-foundation/alibaba/agentexplorer` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/agentexplorer` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/agentexplorer` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/aigen` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/aigen` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/aigen` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/anytrans` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/anytrans` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/anytrans` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/captcha` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/captcha` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/captcha` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth-intl` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth-intl` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth-intl` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/contactcenterai` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/contactcenterai` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/contactcenterai` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/documentparseservice` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/documentparseservice` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/documentparseservice` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/edututor` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/edututor` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/edututor` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/embeddings` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/embeddings` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/embeddings` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/facebody` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/facebody` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/facebody` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/farui` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/farui` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/farui` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/goodstech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/goodstech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/goodstech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/green` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/green` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/green` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageaudit` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageaudit` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageaudit` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imagerecog` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imagerecog` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imagerecog` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageseg` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageseg` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageseg` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/iqs` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/iqs` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/iqs` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ivpd` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ivpd` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ivpd` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/machinetranslation` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/machinetranslation` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/machinetranslation` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/objectdet` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/objectdet` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/objectdet` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr-api` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr-api` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr-api` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/paimodelgallery` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/paimodelgallery` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/paimodelgallery` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/rai` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/rai` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/rai` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/saf` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/saf` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/saf` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/speech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/speech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/speech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/translate` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/translate` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/translate` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/viapi-ocr` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/viapi-ocr` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/viapi-ocr` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoenhan` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoenhan` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoenhan` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videorecog` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videorecog` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videorecog` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoseg` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoseg` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoseg` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/addressvalidation` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/addressvalidation` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/addressvalidation` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/airquality` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/airquality` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/airquality` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/language` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/language` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/language` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/places` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/places` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/places` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/speech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/speech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/speech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/texttospeech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/texttospeech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/texttospeech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/videointelligence` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/videointelligence` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/videointelligence` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/vision` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/vision` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/vision` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |

## EVM (non-Tempo) payment recipients (deduped)

| Provider | Chain | Asset | payTo |
|----------|-------|-------|-------|
| `agentmail/email` | Avalanche | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` |
| `agentmail/email` | Base | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` |
| `agentmail/email` | X Layer | ERC20:0x74b7f16337b8972027f6196a17a631ac6de26d22 | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` |
| `crushrewards/pricing` | Base | USDC | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` |
| `dtelecom/voice` | Base | USDC | `0x47d3394c7234714E4B9e9b74827c12bE847F9DDA` |
| `merit-systems/stablecrypto/market-data` | Base | USDC | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` |
| `merit-systems/stableemail/email` | Base | USDC | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` |
| `merit-systems/stableenrich/enrichment` | Base | USDC | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` |
| `merit-systems/stablephone/calls` | Base | USDC | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` |
| `merit-systems/stablesocial/social-data` | Base | USDC | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` |
| `paysponge/perplexity` | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` |
| `paysponge/rentcast` | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` |
| `quicknode/rpc` | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | X Layer | ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | eip155:1952 (unknown) | ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |

## Tempo (MPP chainId 4217) payment recipients (deduped)

| Provider | Asset | payTo |
|----------|-------|-------|
| `crushrewards/pricing` | USD (Tempo) | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` |
| `merit-systems/stablecrypto/market-data` | USD (Tempo) | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` |
| `merit-systems/stableemail/email` | USD (Tempo) | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` |
| `merit-systems/stableenrich/enrichment` | USD (Tempo) | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` |
| `merit-systems/stablephone/calls` | USD (Tempo) | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` |
| `merit-systems/stablesocial/social-data` | USD (Tempo) | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` |

---

## Providers without a usable challenge

These providers did not return a parseable 402 challenge for the probed endpoint. Causes typically: schema validation rejects empty body, endpoint requires authentication, redirect, or upstream error. A different endpoint or a body matching the spec would likely produce a challenge.

| Provider | HTTP status | Probed URL |
|----------|------------:|------------|
| `merit-systems/stabledomains/domains` | 400 | https://stabledomains.dev/api/check |
| `merit-systems/stablemerch/merchandise` | 400 | https://stablemerch.dev/api/heavyweight-shirt |
| `merit-systems/stablestudio/media-generation` | 400 | https://stablestudio.dev/api/generate/flux-2-max/edit |
| `merit-systems/stableupload/hosting` | 400 | https://stableupload.dev/api/site |
| `socialintel/influencer-search` | 301 | https://api.socialintel.dev/v1/search |
| `solana-foundation/alibaba/texttospeech` | 500 | https://texttospeech.alibaba.gateway-402.com/api/v1/services/aigc/multimodal-generation/generation |
| `solana-foundation/google/bigquery` | 404 | https://bigquery.google.gateway-402.com/projects/{projectId}/queries |
| `solana-foundation/google/civicinfo` | 400 | https://civicinfo.google.gateway-402.com/civicinfo/v2/divisions |
| `solana-foundation/google/documentai` | None | None |
| `solana-foundation/google/factchecktools` | 400 | https://factchecktools.google.gateway-402.com/v1alpha1/claims:search |
| `solana-foundation/google/generativelanguage` | 200 | https://generativelanguage.google.gateway-402.com/v1beta/models |
| `solana-foundation/google/kgsearch` | 400 | https://kgsearch.google.gateway-402.com/v1/entities:search |
| `solana-foundation/google/translate` | None | None |

---

## Methodology notes

- For each provider, the probe target was chosen by: prefer `pricing > 0 AND probe_status == 'ok'` from the registry; else any paid endpoint; else any endpoint.
- Request body was an empty JSON object `{}` for POST/PUT/PATCH; GET requests were sent as-is.
- x402 challenges are encoded as base64-JSON in the `payment-required` HTTP response header; one header carries an `accepts[]` array containing every accepted (network, asset, payTo) triple in the same response.
- MPP challenges are encoded as base64-JSON in the `request="..."` parameter of the `WWW-Authenticate: Payment …` header. Providers that accept multiple SPL tokens emit **one `WWW-Authenticate` header per token** in the same response (commonly USDC + USDT + CASH on Solana). All such headers are decoded; each becomes one row in the per-provider table.
- Solana MPP responses use `methodDetails.network = "mainnet"`; EVM/Tempo MPP responses use `methodDetails.chainId = 4217`.
- Asset labels (USDC/USDT/CASH) are derived by exact-match against a hard-coded registry of known stablecoin addresses; unknown assets are shown as raw addresses (e.g., `ERC20:0x…` or `SPL:…`). This labeling is **not** an on-chain verification.
- Some Solana MPP responses include `splits[]` describing fee distribution to operator/platform recipients in addition to the primary `recipient`. Only the primary `recipient` is shown above.
- The probe captures one snapshot in time. Provider operators can rotate `payTo`, change supported networks, or update prices without notice.
- Recipient addresses are returned as Base58 (Solana) or hex (EVM). EVM addresses are not normalized to checksum case — they are reproduced exactly as the provider returned them.

---

## How this report was produced (reproduction guide)

Anyone can regenerate this document by running the steps below. Total wall time is ~2 minutes (mostly the per-provider HTTP probes). No authentication or paid tokens are needed — every request is the unauthenticated 402 challenge that any HTTP client receives before payment.

### Prerequisites

- `curl`, `jq`, `python3` (3.10+), `bash` available on PATH.
- Outbound HTTPS access to `storage.googleapis.com` and to each provider's `service_url`.
- A scratch working directory. The scripts below default to `/tmp/pay-skills`.

### Step 1 — Fetch the registry index and per-provider JSON

The pay-skills registry is published as a static GCS bucket. The GitHub source repo (`solana-foundation/pay-skills`) is referenced by the dist JSON but **was not yet public at the time of this research** — the GCS dist is the only authoritative source.

```sh
mkdir -p /tmp/pay-skills/providers
cd /tmp/pay-skills

# 1a. Fetch the index of all providers.
curl -s https://storage.googleapis.com/pay-skills/v1/skills.json -o index.json

# 1b. Extract the list of fully-qualified provider names (fqn).
jq -r '.providers[].fqn' index.json > fqns.txt

# 1c. Fetch each provider's normalized JSON. The base URL is taken from index.json's `base_url`.
while read fqn; do
  mkdir -p "providers/$(dirname "$fqn")"
  curl -sf "https://storage.googleapis.com/pay-skills/v1/providers/${fqn}.json" \
    -o "providers/${fqn}.json" || echo "MISS: $fqn"
done < fqns.txt
```

After this step you have `index.json` plus 66 per-provider JSON files under `providers/`.

### Step 2 — Choose one probe target per provider

Each provider exposes many endpoints. We pick one representative endpoint per provider, preferring paid endpoints whose registry-side probe already succeeded.

```sh
cat > select_endpoints.py <<'PYEOF'
import json, os
base = "/tmp/pay-skills/providers"
with open("/tmp/pay-skills/fqns.txt") as f:
    fqns = [l.strip() for l in f if l.strip()]
out = []
def price(e):
    try: return e["pricing"]["dimensions"][0]["tiers"][0].get("price_usd", 0) or 0
    except Exception: return 0
for fqn in fqns:
    with open(os.path.join(base, fqn + ".json")) as fh:
        d = json.load(fh)
    eps = d.get("endpoints") or []
    paid_ok = [e for e in eps if price(e) > 0 and e.get("probe_status") == "ok"]
    paid_any = [e for e in eps if price(e) > 0]
    fallback = [e for e in eps if e.get("probe_status") == "ok"]
    chosen = (paid_ok or paid_any or fallback or eps or [None])[0]
    if chosen is None:
        out.append({"fqn": fqn, "service_url": d.get("service_url"), "skip": "no_endpoints"})
        continue
    out.append({
        "fqn": fqn,
        "service_url": d.get("service_url"),
        "method": chosen.get("method"),
        "path": chosen.get("path"),
        "price_usd": price(chosen),
        "protocol": chosen.get("protocol") or [],
        "supported_usd": chosen.get("supported_usd") or [],
        "probe_status": chosen.get("probe_status"),
        "category": d.get("category"),
        "title": d.get("title"),
    })
with open("/tmp/pay-skills/targets.json", "w") as fh:
    json.dump(out, fh, indent=2)
PYEOF
python3 select_endpoints.py
```

`targets.json` now has one chosen endpoint per provider.

### Step 3 — Probe each endpoint and capture every 402 challenge

We send an unauthenticated request to each target. POST/PUT/PATCH requests get an empty JSON body (`{}`) so most schema validators return a 402 rather than a 400. Two challenge formats are supported, and the parser must capture **all** challenge headers in the response (multi-token MPP providers emit several `WWW-Authenticate` headers in one response):

- **x402**: response carries one `payment-required` header; its base64-JSON body has `accepts[]` enumerating every (network, asset, payTo) tuple.
- **MPP**: response can carry **multiple** `WWW-Authenticate: Payment id="…", method="…", request="<base64-json>"` headers — typically one per token (USDC/USDT/CASH). Decode every one of them.

```sh
cat > probe.py <<'PYEOF'
import json, os, subprocess, base64, time, re
with open("/tmp/pay-skills/targets.json") as f:
    targets = json.load(f)
os.makedirs("/tmp/pay-skills/raw", exist_ok=True)
results = []
for i, t in enumerate(targets):
    fqn = t["fqn"]
    if t.get("skip"):
        results.append({"fqn": fqn, "error": t["skip"]})
        continue
    base_url = (t["service_url"] or "").rstrip("/")
    p = (t["path"] or "").lstrip("/")
    url = f"{base_url}/{p}"
    method = (t.get("method") or "GET").upper()
    cmd = ["curl", "-sS", "-i", "--max-time", "20", "-X", method, url]
    if method in ("POST", "PUT", "PATCH"):
        cmd += ["-H", "content-type: application/json", "-d", "{}"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        raw = r.stdout
    except Exception as e:
        results.append({"fqn": fqn, "url": url, "method": method, "error": f"curl_failed:{e}"})
        continue
    safe = fqn.replace("/", "__")
    with open(f"/tmp/pay-skills/raw/{safe}.txt", "w") as fh:
        fh.write(raw)
    header_block, _, body = raw.partition("\r\n\r\n")
    if not body:
        header_block, _, body = raw.partition("\n\n")
    lines = header_block.splitlines()
    status = None
    if lines:
        m = re.match(r"HTTP/[\d.]+\s+(\d+)", lines[0])
        if m: status = int(m.group(1))
    headers_multi = {}  # keep duplicates
    for line in lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            k = k.strip().lower(); v = v.strip()
            headers_multi.setdefault(k, []).append(v)
    entry = {
        "fqn": fqn, "url": url, "method": method,
        "category": t.get("category"), "title": t.get("title"),
        "registry_price_usd": t.get("price_usd"),
        "http_status": status, "accepts": [], "mpp_requests": [],
    }
    for hdr in ("payment-required", "x-payment-required", "x-payment-accepts"):
        for v in headers_multi.get(hdr, []):
            try:
                data = json.loads(base64.b64decode(v + "==").decode("utf-8", errors="replace"))
                entry["accepts"].extend(data.get("accepts") or [])
                entry["challenge_resource"] = data.get("resource")
            except Exception as e:
                entry.setdefault("decode_errors", []).append(f"{hdr}: {e}")
    for v in headers_multi.get("www-authenticate", []):
        if "Payment" not in v: continue
        m = re.search(r'request="([^"]+)"', v)
        if not m: continue
        try:
            req = json.loads(base64.b64decode(m.group(1) + "==").decode("utf-8", errors="replace"))
            id_match = re.search(r'id="([^"]+)"', v)
            method_match = re.search(r'method="([^"]+)"', v)
            entry["mpp_requests"].append({
                "id": id_match.group(1) if id_match else None,
                "method": method_match.group(1) if method_match else None,
                "request": req,
            })
        except Exception as e:
            entry.setdefault("decode_errors", []).append(f"www-authenticate: {e}")
    results.append(entry)
    time.sleep(0.15)  # polite pacing
with open("/tmp/pay-skills/probe-results.json", "w") as fh:
    json.dump(results, fh, indent=2)
PYEOF
python3 probe.py
```

Outputs:
- `probe-results.json` — structured probe output with parsed `accepts[]` (x402) and `mpp_requests[]` (MPP, one entry per token variant).
- `raw/<fqn>.txt` — the full HTTP response (status line + headers + body) for each provider, useful for re-parsing with different rules later.

### Step 4 — Normalize and render

Map raw fields to friendly labels:
- EVM chain IDs (`eip155:8453` → `Base`, `eip155:43114` → `Avalanche`, …) via a hard-coded map.
- Stablecoin addresses to symbols (`USDC` / `USDT` / `CASH`) by exact match against canonical mints/contracts.
- MPP variants: `methodDetails.chainId == 4217` → Tempo; `methodDetails.network == "mainnet"` → Solana mainnet.
- Amount: `amount` is in the asset's smallest unit; divide by `10**decimals` (6 for USDC/USDT/CASH) to get USD.

Both the row builder and the markdown renderer are short Python scripts; see the working copies in `/tmp/pay-skills/` (`build_report_v2.py`, `render_md_v2.py`).

### How to verify a single row by hand

```sh
# x402: replace url + method with the value from the per-provider table.
curl -sS -i -X POST "https://stableenrich.dev/api/apollo/org-enrich" \
  -H "content-type: application/json" -d "{}" \
  | awk '/^payment-required:/ { sub(/^payment-required: /, ""); print; exit }' \
  | base64 -d | jq '.accepts'

# MPP: capture every WWW-Authenticate header (some providers emit 3).
curl -sS -i -X GET "https://agentexplorer.alibaba.gateway-402.com/openapi/categories" \
  | grep -i '^www-authenticate:' \
  | sed -nE 's/.*request="([^"]+)".*/\1/p' \
  | while read enc; do echo "$enc" | base64 -d | jq -c '.recipient + " " + .currency'; done
```

### Refresh policy

- The pay-skills index (`skills.json`) is rebuilt by Solana Foundation's CI on each merge to the `pay-skills` repo (full rebuild) or a partial rebuild for changed providers. Re-run Step 1 to pick up new providers.
- Provider operators can rotate `payTo` at any time. Re-running Steps 3–4 against the existing `targets.json` is sufficient to refresh recipient addresses without re-fetching the registry.
- The 13 providers in the **Providers without a usable challenge** section can usually be recovered by either (a) sending a body that satisfies the OpenAPI schema, or (b) probing a different endpoint. Both are out of scope for this baseline snapshot.

### Files written under `/tmp/pay-skills`

| Path | Purpose |
|------|---------|
| `index.json` | Snapshot of `skills.json` |
| `fqns.txt` | List of provider fqns from `index.json` |
| `providers/<fqn>.json` | Per-provider normalized JSON from the registry |
| `targets.json` | Chosen probe endpoint per provider |
| `raw/<safe-fqn>.txt` | Full raw HTTP response from each probe (66 files) |
| `probe-results.json` (or `-v2.json`) | Parsed probe output (headers, accepts[], mpp_requests[]) |
| `report-rows.json` (or `-v2.json`) | Normalized report rows (chain labels, asset labels, USD amounts) |