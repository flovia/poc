import { decodeFunctionData } from "viem";
import {
  BASE_USDC_ADDRESS,
  EXECUTE_WITH_AUTHORIZATION_SELECTOR,
  MULTICALL3_AGGREGATE3_ABI,
  MULTICALL3_AGGREGATE3_SELECTOR,
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
} from "../constants";
import type { DecodedMulticall, DecodedMulticallCall, HexAddress, HexData } from "../schema";
import { decodeTransferWithAuthorization } from "./direct-usdc";
import { isHexData } from "./selectors";

export type InnerUsdcTransfer = {
  call: DecodedMulticallCall;
  args: ReturnType<typeof decodeTransferWithAuthorization>["args"];
};

const AUTHORIZATION_SELECTORS = [
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
  EXECUTE_WITH_AUTHORIZATION_SELECTOR,
];

const isAuthorizationSelector = (calldata: HexData) =>
  AUTHORIZATION_SELECTORS.includes(calldata.slice(0, 10).toLowerCase());

export const decodeAggregate3 = (calldata: HexData): DecodedMulticall => {
  const decoded = decodeFunctionData({
    abi: MULTICALL3_AGGREGATE3_ABI,
    data: calldata,
  }) as {
    functionName: string;
    args: [[{ target: HexAddress; allowFailure: boolean; callData: HexData }]];
  };

  if (decoded.functionName !== "aggregate3") {
    throw new Error(`Expected aggregate3, got ${decoded.functionName}`);
  }

  return {
    calls: decoded.args[0].map((call) => ({
      target: call.target,
      allowFailure: call.allowFailure,
      callData: call.callData,
    })),
  };
};

export const extractUsdcCallsFromMulticall = (calldata: HexData): InnerUsdcTransfer[] => {
  const aggregate = decodeAggregate3(calldata);
  return aggregate.calls
    .filter(
      (call): call is DecodedMulticallCall & { target: HexAddress } =>
        isHexData(call.callData) &&
        call.target.toLowerCase() === BASE_USDC_ADDRESS.toLowerCase() &&
        isAuthorizationSelector(call.callData),
    )
    .map((call) => ({
      call,
      args: decodeTransferWithAuthorization(call.callData).args,
    }));
};

export const isAggregate3Selector = (selector: string): boolean =>
  selector === MULTICALL3_AGGREGATE3_SELECTOR;
