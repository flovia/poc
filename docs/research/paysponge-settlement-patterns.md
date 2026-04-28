# Paysponge 決済パターンレビュー

このメモは、ウォレット利用グラフとファシリテーターフィンガープリント変更に関する、現在の fixture/corpus の不一致を記録する。

## 現在の `poc` fixture における根拠

`apps/cli/fixtures/raw/paysponge-perplexity.transaction.json` は現在、次の内容を記録している。

- トップレベルの `to`: Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- トップレベルの selector: `0xcf092995`
- 形状: 直接 USDC bytes 署名 `transferWithAuthorization`

同じ直接 USDC bytes 署名スタイルは、現在の `paysponge-wolframalpha` fixture にも見られる。

## 隣接する foxytanuki corpus における根拠

`../foxytanuki/docs/x402-analysis/endpoint-discovery.md` では、Paysponge Perplexity と Paysponge WolframAlpha が次のように記録されている。

- トップレベルの `to`: canonical Multicall3 `0xca11bde05977b3631167028862be2a173976ca11`
- トップレベルの selector: `0x82ad56cb`
- 繰り返し出現する relayer: `0xb2bd29925cbbcea7628279c91945ca5b98bf371b`
- 形状: Base USDC authorization transfer をラップする Multicall3 `aggregate3`

## 実装方針

来歴が完全に照合されるまでは、どちらも根拠に裏付けられた Paysponge 関連の決済クラスタとして扱う。

- `direct_usdc_bytes_signature_transfer_with_authorization`
- `multicall3_usdc_bytes_signature_authorization`

Paysponge 内部ファシリテーション候補には、Paysponge がホストするリクエスト、デコードされた payment response tx、観測されたオンチェーン tx、決済パターン、relayer/決済の根拠を組み合わせた証拠が必要である。パターンのみの一致は決済クラスタ候補に留まり、高信頼の名前付き Paysponge ファシリテーターラベルにはならない。
