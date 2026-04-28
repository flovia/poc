import {
  listAttributionCandidates,
  listDailyMetrics,
  listPaymentObservations,
  listPayerProfiles,
  listRecipientSummaries,
  listRelayerSummaries,
} from "../../../cli/lib/aggregates/summaries";
import {
  toAttributionCandidateDto,
  toDailyMetricDto,
  toPaymentObservationDto,
  toWalletProfileDto,
} from "../../../cli/lib/api/dto";
import { buildReportSummary } from "../../../cli/lib/api/summary";
import { buildWalletUsageGraph } from "../../../cli/lib/attribution/wallet-graph";
import type { AppDatabase } from "../../../cli/lib/db";
import { getCustomerProfileProjection, listCustomerProjections } from "./customer-projections";

export type BffReadService = ReturnType<typeof createBffReadService>;

export const createBffReadService = (database: AppDatabase) => ({
  getSummary: () => buildReportSummary(database),
  listObservations: () => listPaymentObservations(database).map(toPaymentObservationDto),
  listAttributionCandidates: () =>
    listAttributionCandidates(database).map(toAttributionCandidateDto),
  listDailyMetrics: () => listDailyMetrics(database).map(toDailyMetricDto),
  listPayerWallets: () => listPayerProfiles(database).map(toWalletProfileDto),
  listRecipientWallets: () => listRecipientSummaries(database).map(toWalletProfileDto),
  listRelayerWallets: () => listRelayerSummaries(database).map(toWalletProfileDto),
  getWalletUsageGraph: () => buildWalletUsageGraph(database),
  listCustomers: () => listCustomerProjections(database),
  getCustomerProfile: (address: string) => getCustomerProfileProjection(database, address),
});
