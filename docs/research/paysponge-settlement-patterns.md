# Paysponge settlement patterns

2026-04-28 に live probe と paid request で確認した内容を記録する。

## Paysponge endpoints

以下の Paysponge endpoints は Base mainnet の x402 challenge を返した。

| endpoint | method | network | amount | asset | payTo |
| --- | --- | --- | --- | --- | --- |
| `https://pplx.x402.paysponge.com/search` | POST | `eip155:8453` | `10000` | Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` |
| `https://wolframalpha.x402.paysponge.com/v1/result?i=2%2B2` | GET | `eip155:8453` | `10000` | Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` |

Paid request 後の settlement は、どちらも Multicall3 経由だった。

| service | tx | method | relayer | payer | recipient | amount |
| --- | --- | --- | --- | --- | --- | --- |
| Paysponge Perplexity | `0xff2efef85ca9328e71712d8d07d0d6677522d6254d536c645683f0c40f488557` | `multicall3_aggregate3` | `0xc6699d2aada6c36dfea5c248dd70f9cb0235cb63` | `0x62C2d106293398961894BCd4908B06a8620B7351` | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` | `10000` |
| Paysponge Wolfram Alpha | `0x45a45e03d1be8aefda8c886d1ffa16f57955a9096909057239007daf1f22f35b` | `multicall3_aggregate3` | `0xb2bd29925cbbcea7628279c91945ca5b98bf371b` | `0x62C2d106293398961894BCd4908B06a8620B7351` | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` | `10000` |

Multicall3 tx の構造:

- top-level `to`: canonical Multicall3 `0xca11bde05977b3631167028862be2a173976ca11`
- top-level selector: `0x82ad56cb` (`aggregate3`)
- inner target: Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- inner call: bytes 署名形式の USDC authorization transfer
- receipt: `AuthorizationUsed` と `Transfer` を確認

## Direct settlement examples

比較対象として、同じ payer から実行した別の live x402 paid request では direct USDC settlement を確認した。

| service | tx | method | selector | relayer | recipient | amount |
| --- | --- | --- | --- | --- | --- | --- |
| CoinGecko | `0xc26c25f66d72f48212e632a51de66f5ed735a9694d5405f96eaa1aebf3cbb7bb` | `direct_transferWithAuthorization` | `0xe3ee160e` | `0xa32ccda98ba7529705a059bd2d213da8de10d101` | `0x110cdBba7FE6434Ec4CE3464CC523942ad6Fb784` | `10000` |
| Exa | `0x196b575769f4712a19e53746ebed430f07bd4bfd26f5ad10861545ad5c74801a` | `direct_transferWithAuthorization` | `0xe3ee160e` | `0x97acce27d5069544480bde0f04d9f47d7422a016` | `0x6d6E695b09861467c7d462f5AAF31cF3540B9192` | `7000` |

## Classification

今回の観測範囲では、以下の分類になる。

- Paysponge hosted endpoints: `multicall3_aggregate3`
- CoinGecko / Exa の native x402 endpoints: `direct_transferWithAuthorization`

ただし、`Multicall3` 単体では Paysponge と断定しない。Paysponge-mediated と分類するには、request host、payment challenge、payment-response tx、recipient、relayer、receipt logs を組み合わせて確認する。

## Multicall3 の意味

Multicall3 は x402/USDC settlement に必須ではない。CoinGecko と Exa は direct call で settlement できている。

Paysponge の Multicall3 は、1 要素の `aggregate3` として USDC authorization transfer を包んでいる。観測できた事実は、Paysponge の settlement 実装が canonical Multicall3 を envelope として使っていることまでである。

合理的な解釈は、settlement operator 側で「call 配列を実行する」共通経路に寄せている、というもの。今回の tx から fee split、batching、追加 hook は確認できない。
