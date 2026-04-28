import crypto from "node:crypto";
import {
  BASE_CHAIN_ID,
  BASE_USDC_ADDRESS,
  BASE_USDC_ADDRESS as USDC,
  MULTICALL3_ADDRESS,
  MULTICALL3_AGGREGATE3_SELECTOR,
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
} from "../constants";
import type { RawReceipt, RawTransaction, SettledEvidence, PaymentObservationInput } from "../schema";
import { extractTopLevelSelector } from "../decoder/selectors";
import { decodeReceiptLogsForUsdc } from "../decoder/logs";
import { decodeTransferWithAuthorization } from "../decoder/direct-usdc";
import { extractUsdcCallsFromMulticall } from "../decoder/multicall3";

const toBlockNumber = (value: string): number => {
  if (value.startsWith("0x")) return Number.parseInt(value, 16);
  return Number(value);
};

const toLower = (value: string) => value.toLowerCase();

const buildStableHash = (input: string) =>
  crypto
    .createHash("sha256")
    .update(input)
    .digest("hex");

const hasRequiredUsdcLogs = (
  events: ReturnType<typeof decodeReceiptLogsForUsdc>,
  payer: string,
  recipient: string,
  amount: bigint,
) => {
  const hasAuth = events.some((event) => event.kind === "authorization" && event.authorizer?.toLowerCase() === toLower(payer));
  const hasTransfer = events.some(
    (event) =>
      event.kind === "transfer" &&
      event.from?.toLowerCase() === toLower(payer) &&
      event.to?.toLowerCase() === toLower(recipient) &&
      event.amount === amount,
  );
  return {
    hasAuth,
    hasTransfer,
    complete: hasAuth && hasTransfer,
  };
};

const makeEvidence = (type: SettledEvidence["type"], detail: string, raw: unknown): SettledEvidence => ({ type, detail, raw });

export const buildObservationsFromFixture = (
  caseId: string,
  tx: RawTransaction,
  receipt: RawReceipt,
): PaymentObservationInput[] => {
  if (tx.chainId !== BASE_CHAIN_ID) return [];
  if (tx.to == null) return [];

  const selector = extractTopLevelSelector(tx.input);
  if (!selector) return [];

  const logs = decodeReceiptLogsForUsdc(receipt.logs);

  const observations: PaymentObservationInput[] = [];
  const txIndex = 0;
  const blockTimestamp = tx.blockTimestamp;
  const blockNumber = toBlockNumber(tx.blockNumber);

  if (selector === TRANSFER_WITH_AUTHORIZATION_SELECTOR && toLower(tx.to) === toLower(BASE_USDC_ADDRESS)) {
    const decoded = decodeTransferWithAuthorization(tx.input);
    const logsValidation = hasRequiredUsdcLogs(logs, decoded.args.from, decoded.args.to, decoded.args.value);
    if (!logsValidation.complete) return [];

    const stableHash = buildStableHash(
      [caseId, tx.hash, String(blockNumber), tx.chainId, decoded.args.from, decoded.args.to, decoded.args.value.toString(), selector].join("|"),
    );

    observations.push({
      chainId: tx.chainId,
      txHash: tx.hash,
      txIndex,
      blockNumber,
      blockTimestamp,
      relayer: tx.from,
      payer: decoded.args.from,
      recipient: decoded.args.to,
      amountAtomic: decoded.args.value.toString(),
      tokenAddress: USDC,
      method: "direct_transferWithAuthorization",
      topLevelSelector: selector,
      caseId,
      stableHash,
      evidence: [
        makeEvidence("authorization", "transferWithAuthorization calldata", { selector, arguments: decoded.args }),
        makeEvidence("transfer", "USDC Transfer log", logs.filter((event) => event.kind === "transfer")),
        makeEvidence("fixture", "fixture logs matched", {
          totalLogs: logs.length,
          authorizationLogs: logs.filter((event) => event.kind === "authorization").length,
          transferLogs: logs.filter((event) => event.kind === "transfer").length,
        }),
      ],
    });
    return observations;
  }

  if (selector === MULTICALL3_AGGREGATE3_SELECTOR && toLower(tx.to) === toLower(MULTICALL3_ADDRESS)) {
    const calls = extractUsdcCallsFromMulticall(tx.input);
    if (calls.length === 0) return [];

    for (const inner of calls) {
      const args = inner.args;
      const logsValidation = hasRequiredUsdcLogs(logs, args.from, args.to, args.value);
      if (!logsValidation.complete) continue;

      const stableHash = buildStableHash(
        [caseId, tx.hash, String(blockNumber), tx.chainId, inner.call.target, args.from, args.to, args.value.toString(), String(inner.call.callData)].join("|"),
      );

      observations.push({
        chainId: tx.chainId,
        txHash: tx.hash,
        txIndex,
        blockNumber,
        blockTimestamp,
        relayer: tx.from,
        payer: args.from,
        recipient: args.to,
        amountAtomic: args.value.toString(),
        tokenAddress: USDC,
        method: "multicall3_aggregate3",
        topLevelSelector: selector,
        caseId,
        stableHash,
        evidence: [
          makeEvidence("multicall", "multicall3 aggregate3 decoded", inner),
          makeEvidence("transfer", "USDC Transfer log", logs.filter((event) => event.kind === "transfer")),
          makeEvidence("fixture", "fixture logs matched", {
            totalLogs: logs.length,
            authorizationLogs: logs.filter((event) => event.kind === "authorization").length,
            transferLogs: logs.filter((event) => event.kind === "transfer").length,
          }),
        ],
      });
    }

    return observations;
  }

  return [];
};
