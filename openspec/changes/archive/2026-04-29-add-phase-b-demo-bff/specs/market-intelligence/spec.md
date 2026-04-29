## MODIFIED Requirements

### Requirement: BFF は request ごとに外部 source を呼ばない

初期 market intelligence design では、BFF request handler が product read のために CDP や Bitquery を直接呼ぶことを要求しない。Phase B の demo BFF では、Phase A snapshot / projection 相当の値を prepared demo fixture または read model として扱い、`onchain_fact` として説明できる field と demo / future / derived field を区別することを MUST とする。

#### シナリオ: product read path を後から追加する

- **条件** この change の後に BFF market intelligence endpoint を実装する
- **結果** endpoint は user request ごとに live Bitquery GraphQL call を発行せず、生成済み snapshot、projection、保存済み data、または prepared demo read model を読む

#### シナリオ: Phase B read model が Phase A 相当の値を含む

- **条件** Phase B BFF response が wallet、pay_to、payment frequency、co-usage など Phase A snapshot / projection 相当の値を含む
- **結果** システムはそれらを request path で再取得せず、prepared demo read model 内の `onchain_fact` として返す
