## 追加要件

### 要件: CDP discovery resource を正規化する

システムは CDP x402 Discovery resource を取得し、各 resource と payment option をこの repository が所有する contract 型へ正規化する。

#### シナリオ: Base USDC payment option を持つ resource

- **条件** CDP resource が `resource`、`network`、`asset`、`amount`、`payTo` を持つ Base USDC payment option を含む
- **結果** システムは、それらの field と source provenance を含む正規化済み payment option を持つ resource を記録する

#### シナリオ: resource が未対応 network を含む

- **条件** CDP resource が要求された snapshot scope 外の network 向け payment option を含む
- **結果** システムは、正規化済み resource 自体は落とさず、その payment option を scoped Bitquery aggregation から除外する

### 要件: Bitquery payment activity を集計する

システムは、正規化済み payment option に一致する payment activity を Bitquery GraphQL に問い合わせ、要求された time window の aggregate transfer metrics を返す。

#### シナリオ: payment option に観測済み transfer がある

- **条件** Bitquery が payment option の `network`、`asset`、`payTo` に対する transfer を返す
- **結果** システムは、その payment option の transaction count、unique sender count、payment volume、latest observed transfer metadata を報告する

#### シナリオ: payment option に観測済み transfer がない

- **条件** Bitquery が payment option に一致する transfer を返さない
- **結果** システムは snapshot build を失敗させず、その payment option の activity metrics を zero として報告する

### 要件: market snapshot は metadata と activity を結合する

システムは、正規化済み payment option identity によって CDP resource metadata と Bitquery transfer aggregate を結合した market snapshot を構築する。

#### シナリオ: CDP payment option が Bitquery aggregate に一致する

- **条件** 正規化済み payment option と Bitquery aggregate が同じ `network`、`asset`、`payTo` を共有する
- **結果** snapshot は resource、payment option、source quality field、activity metrics を1つの market resource entry に含める

#### シナリオ: CDP と Bitquery の metrics が一致しない

- **条件** CDP quality metrics と Bitquery activity metrics が大きく異なる
- **結果** snapshot はどちらかの source を上書きせず、両方の値を保持し、resource に discrepancy indicator を付ける

### 要件: CLI が market report を生成する

システムは、CDP と Bitquery data から JSON / Markdown market snapshot report を生成する CLI command を提供する。

#### シナリオ: snapshot command が成功する

- **条件** operator が有効な Bitquery credential で market snapshot command を実行する
- **結果** システムは JSON snapshot report と Markdown summary report を設定済み output path に書き出す

#### シナリオ: Bitquery credential がない

- **条件** operator が Bitquery data を必要とする snapshot を `BITQUERY_TOKEN` なしで実行する
- **結果** システムは明確な configuration error で失敗し、誤解を招く partial activity report を書き出さない

### 要件: BFF は request ごとに外部 source を呼ばない

初期 market intelligence design では、BFF request handler が product read のために CDP や Bitquery を直接呼ぶことを要求しない。

#### シナリオ: product read path を後から追加する

- **条件** この change の後に BFF market intelligence endpoint を実装する
- **結果** endpoint は user request ごとに live Bitquery GraphQL call を発行せず、生成済み snapshot、projection、または保存済み data を読む
