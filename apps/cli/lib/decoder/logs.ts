import { decodeEventLog } from "viem";
import { BASE_USDC_ADDRESS, USDC_TRANSFER_WITH_AUTHORIZATION_ABI, EVENT_AUTHORIZATION_USED_TOPIC, EVENT_TRANSFER_TOPIC } from "../constants";
import type { DecodedLogEvent, TxLog } from "../schema";

const eventAbi = USDC_TRANSFER_WITH_AUTHORIZATION_ABI;

export const decodeReceiptLogsForUsdc = (logs: TxLog[]): DecodedLogEvent[] => {
  const events: DecodedLogEvent[] = [];

  for (const [idx, log] of logs.entries()) {
    if (log.address.toLowerCase() !== BASE_USDC_ADDRESS.toLowerCase()) {
      continue;
    }

    const topic0 = log.topics[0] ?? "";
    const eventTopics = log.topics as ["0x" & string, ...(Array<`0x${string}`>)];

    if (topic0.toLowerCase() === EVENT_AUTHORIZATION_USED_TOPIC.toLowerCase()) {
      const decoded = decodeEventLog({
        abi: eventAbi,
        topics: eventTopics,
        data: log.data,
      }) as {
        eventName: string;
        args: { authorizer: `0x${string}`; nonce: `0x${string}` };
      };

      if (decoded.eventName === "AuthorizationUsed") {
        events.push({
          kind: "authorization",
          index: idx,
          txHash: log.transactionHash,
          authorizer: decoded.args.authorizer,
          nonce: decoded.args.nonce,
        });
      }
      continue;
    }

    if (topic0.toLowerCase() === EVENT_TRANSFER_TOPIC.toLowerCase()) {
      const decoded = decodeEventLog({
        abi: eventAbi,
        topics: eventTopics,
        data: log.data,
      }) as { eventName: string; args: { from: `0x${string}`; to: `0x${string}`; value: bigint } };

      if (decoded.eventName === "Transfer") {
        events.push({
          kind: "transfer",
          index: idx,
          txHash: log.transactionHash,
          from: decoded.args.from,
          to: decoded.args.to,
          amount: decoded.args.value,
        });
      }
    }
  }

  return events;
};
