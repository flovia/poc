import { decodeFunctionData } from "viem";
import {
  EXECUTE_WITH_AUTHORIZATION_SELECTOR,
  MULTICALL3_AGGREGATE3_SELECTOR,
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
  USDC_TRANSFER_WITH_AUTHORIZATION_ABI,
} from "../constants";
import type { HexAddress, HexData, TransferWithAuthorizationArgs } from "../schema";

export type TransferWithAuthorizationDecoded = {
  selector:
    | typeof TRANSFER_WITH_AUTHORIZATION_SELECTOR
    | typeof EXECUTE_WITH_AUTHORIZATION_SELECTOR;
  args: TransferWithAuthorizationArgs;
};

const functionAbi = USDC_TRANSFER_WITH_AUTHORIZATION_ABI;

const decodeTransferWithAuthorizationV2 = (calldata: HexData): TransferWithAuthorizationArgs => {
  const decoded = decodeFunctionData({
    abi: [functionAbi[0]],
    data: calldata,
  }) as unknown as {
    functionName: "transferWithAuthorization";
    args: readonly [
      HexAddress,
      HexAddress,
      bigint,
      bigint,
      bigint,
      HexData,
      bigint,
      HexData,
      HexData,
    ];
  };

  const [from, to, value, validAfter, validBefore, nonce, v, r, s] = decoded.args;
  return {
    authorizationKind: "vrs",
    from,
    to,
    value,
    validAfter,
    validBefore,
    nonce,
    v: Number(v),
    r,
    s,
  };
};

const decodeTransferWithAuthorizationV3 = (calldata: HexData): TransferWithAuthorizationArgs => {
  const decoded = decodeFunctionData({
    abi: [functionAbi[1]],
    data: calldata,
  }) as unknown as {
    functionName: "transferWithAuthorization";
    args: readonly [HexAddress, HexAddress, bigint, bigint, bigint, HexData, HexData];
  };

  const [from, to, value, validAfter, validBefore, nonce, signature] = decoded.args;
  return { authorizationKind: "bytes", from, to, value, validAfter, validBefore, nonce, signature };
};

export const decodeTransferWithAuthorization = (
  calldata: HexData,
): TransferWithAuthorizationDecoded => {
  const selector = calldata.slice(0, 10).toLowerCase() as
    | typeof TRANSFER_WITH_AUTHORIZATION_SELECTOR
    | typeof EXECUTE_WITH_AUTHORIZATION_SELECTOR
    | (string & {});

  if (selector === EXECUTE_WITH_AUTHORIZATION_SELECTOR) {
    const args = decodeTransferWithAuthorizationV3(calldata);
    return {
      selector: EXECUTE_WITH_AUTHORIZATION_SELECTOR,
      args,
    };
  }

  if (selector === TRANSFER_WITH_AUTHORIZATION_SELECTOR) {
    const args = decodeTransferWithAuthorizationV2(calldata);
    return {
      selector: TRANSFER_WITH_AUTHORIZATION_SELECTOR,
      args,
    };
  }

  // Support legacy selector only in this decoder.
  const decoded = decodeFunctionData({
    abi: [functionAbi[0]],
    data: calldata,
  }) as unknown;
  throw new Error(
    `Expected transfer/executeWithAuthorization selector, got ${String(selector)}; decode=${JSON.stringify(decoded)}`,
  );
};
