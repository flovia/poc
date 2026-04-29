import { rebuildWalletProfiles } from "../../lib/aggregates/wallets";
import { buildDailyMetrics } from "../../lib/aggregates/daily";

const dailyMetrics = buildDailyMetrics();
const wallets = rebuildWalletProfiles();

console.log(
  JSON.stringify(
    {
      dailyBuckets: dailyMetrics.length,
      payerWalletProfiles: wallets.payerProfiles,
      recipientSummaries: wallets.recipientProfiles,
      relayerSummaries: wallets.relayerProfiles,
    },
    null,
    2,
  ),
);
