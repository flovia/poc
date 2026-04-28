# x402 attribution data acquisition strategy

## 概要

現在のデータは、**historical offline regression baseline** として扱う。現在の x402 エコシステムの真実としては扱わない。

2026-04-28 に一部 endpoint は live paid probe 済み。current live evidence は以下に記録する。

- `docs/research/live-x402-paid-probe-results.md`

この strategy は、live evidence を継続取得・検証・昇格するための運用方針として残す。

推奨モデルはハイブリッド。

- スクリプト: HTTP probe、支払い実行、tx/receipt 取得、decode、join、schema validation、confidence cap の authoritative source。
- LLM: endpoint discovery、ドキュメント抽出、命名、矛盾の要約、review note の補助。
- 人間: candidate claim を promoted にしてよいかの最終判断。
- LLM だけを根拠に high-confidence attribution を作らない。

## 残すべき情報

### raw tx/receipt fixtures

残すもの:

- `apps/cli/fixtures/raw/*.transaction.json`
- `apps/cli/fixtures/raw/*.receipt.json`
- `apps/cli/fixtures/manifest.json`

用途:

- immutable な historical onchain fixture evidence;
- parser regression input;
- offline verification baseline。

これらは tx/receipt が揃っていて decode できる onchain fact なので価値がある。

### expected outputs

残すもの:

- `apps/cli/fixtures/expected/observations.json`
- `apps/cli/fixtures/expected/attribution_candidates.json`
- `apps/cli/fixtures/expected/wallet_usage_graph.json`

用途:

- deterministic regression output;
- 実装変更で挙動が変わったか検出するための golden file。

これは production data ではない。

### settlement fingerprint packs

残すもの:

- `apps/cli/fixtures/knowledge/settlement_fingerprint_packs.json`

用途:

- settlement mechanics の定義。

例:

- `direct_usdc_vrs_transfer_with_authorization`
- `direct_usdc_bytes_signature_transfer_with_authorization`
- `multicall3_usdc_bytes_signature_authorization`

重要な区別:

- settlement cluster = どう決済されたか
- facilitator entity = 誰がその決済フローを運用していそうか

pattern-only evidence を、そのまま high-confidence named facilitator claim にしない。

## 残すが、意味を下げる情報

### `x402_analysis_normalized_probes.json`

historical probe corpus snapshot として残す。

強み:

- derived provider claims より情報量が多い;
- request URL、payment requirement、decoded payment response、tx hash、payTo、network、asset、amount を含む;
- 将来の再取得結果と比較できる。

弱み:

- `/tmp/x402-probes*` artifact path を参照している;
- top-level acquisition run id / collected timestamp がない;
- paid、dry-run、error、not-required が混在している;
- 現在の endpoint behavior を保証しない。

用途:

- historical probe corpus;
- discovery snapshot;
- 将来 capture との比較材料。

現在の真実としては扱わない。

### `known_fingerprints.json`

offline fixture seed として残す。

ただし、再取得と review なしに production-grade wallet fingerprint catalog として扱わない。

### `provider_endpoint_claims.json`

temporary operational seed / fixture helper としてのみ残す。

長期的には、provider endpoint claims は再取得された probe evidence から導出する。

## 取り直すべき情報

### provider endpoint / payTo mapping

現在の attribution に使うなら取り直す。

理由:

- endpoint は変わる;
- payTo wallet は変わる;
- amount / asset は変わる;
- network label は変わる;
- catalog は stale になる;
- middleman は routing や account management を変える。

### Paysponge evidence

最優先で取り直す。

現在の不一致:

- poc fixture: Paysponge = direct Base USDC bytes-signature `transferWithAuthorization`
- foxytanuki corpus: Paysponge = Multicall3 `aggregate3` wrapping Base USDC authorization transfer

end-to-end で取り直す情報:

- Paysponge hosted request;
- 402 challenge;
- decoded payment response tx;
- onchain tx;
- receipt logs;
- settlement pattern;
- relayer;
- recipient/payTo;
- amount。

### facilitator / settlement operator attribution

composite evidence で取り直す。

settlement pattern だけから named facilitator を推定しない。

必要な evidence:

- request host;
- decoded payment response tx;
- observed tx/receipt;
- settlement pattern;
- relayer evidence;
- official docs/catalog where available。

### negative fixtures

real-world negative を増やす。

欲しい negative data:

- real unrelated Base tx;
- real non-x402 USDC transfer;
- real Multicall3 but non-x402 tx;
- real failed or incomplete x402-like tx。

## 再取得時に必要な情報

### acquisition run metadata

必要フィールド:

- `runId`
- `collectorVersion`
- `collectedAt`
- `networkPolicy`
- `spendLimitAtomic`
- `walletAddress`
- `rpcProvider`
- `sourceManifestSha256`

### endpoint metadata

必要フィールド:

- `caseId`
- `entityId`
- `providerName`
- `serviceName`
- `endpointUrl`
- `resourceUrl`
- `requestHost`
- `method`
- `requestBodyTemplateHash`
- `sourceUrl`
- `discoveryMethod`: `catalog | docs | prior_fixture | llm_candidate | manual`

### 402 challenge / payment requirement

必要フィールド:

- `statusCode`
- `x402Version`
- `scheme`
- `network`
- `chainId`
- `asset`
- `amountAtomic`
- `payTo`
- `resource`
- `rawChallengeSha256`
- `rawChallengeArtifactPath`

### paid response

必要フィールド:

- `paid`
- `paymentResponseHeaderName`
- `decodedSuccess`
- `decodedTransaction`
- `decodedNetwork`
- `decodedPayer`
- `responseStatus`
- `responseBodySha256`
- `redactionPolicy`

### onchain join

必要フィールド:

- `txHash`
- `blockNumber`
- `blockHash`
- `blockTimestamp`
- `receiptStatus`
- `txFrom`
- `topLevelTo`
- `topLevelSelector`
- `innerSelector`
- `payerWallet`
- `recipientWallet`
- `tokenAddress`
- `amountAtomic`
- `authorizationNonce`
- `logProofRefs`

### attribution metadata

必要フィールド:

- `evidenceClass`: `paid_probe | dry_run | catalog | manual | pattern_only`
- `roles`
- `confidence`
- `confidenceReasons`
- `confidenceCapsApplied`
- `evidenceRefs`
- `provenance`
- `reviewStatus`: `candidate | reviewed | promoted`
- `validFrom`
- `validTo`
- `reverifyAfter`
- `conflictsWith`

## evidence quality tiers

| Tier | Evidence | 許可される結論 | confidence 目安 |
| --- | --- | --- | ---: |
| A | paid probe + decoded payment response tx + onchain tx/receipt join | provider endpoint/payTo claim。host/docs/settlement も揃えば named facilitator 候補 | 90-95 |
| B | dry-run 402 challenge with payTo/asset/network/amount, no tx | endpoint requires payment。payTo candidate | 60-80 |
| C | official docs/catalog exposing endpoint/payTo | provider endpoint candidate | cap around 70 |
| D | onchain settlement pattern only | settlement cluster only | mechanic は high、entity は low/none |
| E | LLM/manual/blog/social/screenshot | discovery candidate only | promote しない |
| F | error/null/incomplete probes | negative/discovery evidence only | attribution なし |

## acquisition workflow

### 1. inventory

candidate endpoint、payTo wallet、tx hash、source reference の manifest を作る。

各 record を evidence tier A-F に分類する。

推奨出力:

- `endpoint_manifest.json`

### 2. discovery

structured catalog / docs は script で読む。

prose documentation や web page からの候補発見には LLM を使ってよい。

ただし LLM output は candidate として保存し、直接 promoted claim にしない。

### 3. dry-run probe

`X-PAYMENT` なしで request する。

取得するもの:

- status;
- headers;
- 402 body;
- payment requirements;
- payTo;
- network;
- asset;
- amount;
- resource;
- facilitator URL if exposed。

### 4. paid probe

burner wallet と厳格な spend control を使う。

実行手段:

- `x402` CLI を使う。
- paid execution では `--mode mainnet`、`--network base`、`--spend-limit <amount>` を明示する。
- 秘密鍵は `X402_EVM_PRIVATE_KEY` などの環境変数で渡し、artifact や docs に保存しない。

要件:

- endpoint allowlist;
- per-endpoint spend cap;
- total run spend cap;
- private key を artifact に保存しない;
- sensitive header は redact するか secure artifact store に置く。

取得するもの:

- payment response header name;
- decoded payment response;
- transaction hash;
- response status;
- response body hash。

### 5. onchain verification

取得する RPC:

- `eth_getTransactionByHash`
- `eth_getTransactionReceipt`
- `eth_getBlockByNumber`

decode するもの:

- tx.to;
- top-level selector;
- inner selector;
- logs;
- payer;
- recipient;
- amount;
- relayer。

### 6. join validation

検証すること:

- challenge payTo equals onchain recipient;
- challenge amount equals onchain amount;
- challenge asset equals onchain token;
- decoded payment tx equals fetched tx;
- decoded payer equals onchain payer。

この step を通った record だけを high-confidence evidence にする。

### 7. claim generation

validated artifact から claim を生成する。

ルール:

- conflict は潰さず残す;
- historical record を overwrite せず append する;
- evidence class に応じて confidence cap を適用する;
- すべての record に evidence refs と provenance を残す。

### 8. review and promotion

LLM と人間 review は conflict summary や label recommendation に使える。

promote してよいのは、script-verified または human-reviewed evidence のみ。

## automation vs LLM

### script でやるべきこと

- HTTP probing;
- x402 challenge parsing;
- payment execution;
- tx/receipt fetch;
- selector/log decoding;
- address normalization;
- challenge-to-onchain join;
- schema validation;
- confidence cap;
- fixture regeneration;
- deterministic diff。

### LLM でやってよいこと

- docs/web page からの endpoint discovery;
- provider/service/entity name suggestion;
- prose documentation extraction;
- conflict summarization;
- human-readable review notes。

### 人間が決めること

- entity label を採用してよいか;
- source を official とみなしてよいか;
- candidate を promoted にしてよいか;
- named facilitator claim として十分か。

## recommended phased plan

### Phase 0: current baseline を freeze

- current fixtures と expected outputs を安定させる。
- current data を historical fixture evidence と明記する。
- current fixtures は削除しない。

### Phase 1: acquisition manifest を追加

- target endpoint を一覧化する。
- expected network, asset, method, spend cap, reverify cadence を持たせる。
- current records を evidence tier ごとに分類する。

### Phase 2: dry-run evidence を再取得

- 支払いなしで probe する。
- current payTo, asset, amount, network, resource を記録する。
- historical snapshot と比較する。
- `x402 probe --json --verbose-json` を標準の dry-run capture 手段にする。

### Phase 3: paid revalidation

2026-04-28 時点で、CoinGecko、Orthogonal、Paysponge の一部 endpoint は paid revalidation 済み。

記録:

- `docs/research/live-x402-paid-probe-results.md`

優先順位:

1. Paysponge endpoints;
2. shared payTo cases;
3. catalog-only claims;
4. high-value known providers;
5. negatives and false-positive controls。

### Phase 4: attribution corpus を再構築

- validated artifact から provider endpoint claims を生成する。
- historical と current record を time-bound observation として残す。
- attribution candidates と wallet graph outputs を再生成する。

### Phase 5: ongoing monitoring

- dry-run は定期実行する。
- paid probe は challenge が変わった、attribution が contested、endpoint value が高い場合だけ実行する。
- stale claims は定義した window で expire / downgrade する。

## 最終推奨

current data は historical offline regression corpus として残す。

current provider、payTo、facilitator、settlement-operator attribution を主張するための情報は再取得する。

truth acquisition は script、discovery/review support は LLM、promotion decision は human review に分ける。
