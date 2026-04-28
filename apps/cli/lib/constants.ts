export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_NAME = "base" as const;

export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const TRANSFER_WITH_AUTHORIZATION_SELECTOR = "0xe3ee160e";
export const EXECUTE_WITH_AUTHORIZATION_SELECTOR = "0xcf092995";
export const MULTICALL3_AGGREGATE3_SELECTOR = "0x82ad56cb";

export const EVENT_AUTHORIZATION_USED_TOPIC =
  "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5";
export const EVENT_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export const USDC_TRANSFER_WITH_AUTHORIZATION_ABI = [
  {
    type: "function",
    name: "transferWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  } as const,
  {
    type: "function",
    name: "transferWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  } as const,
  {
    type: "event",
    name: "AuthorizationUsed",
    anonymous: false,
    inputs: [
      { name: "authorizer", type: "address", indexed: true },
      { name: "nonce", type: "bytes32", indexed: true },
    ],
  } as const,
  {
    type: "event",
    name: "Transfer",
    anonymous: false,
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  } as const,
] as const;

export const MULTICALL3_AGGREGATE3_ABI = [
  {
    type: "function",
    name: "aggregate3",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "returnData", type: "bytes[]" }],
  } as const,
] as const;

export const KNOWN_METHODS = [
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
  EXECUTE_WITH_AUTHORIZATION_SELECTOR,
  MULTICALL3_AGGREGATE3_SELECTOR,
] as const;

export type KnownMethodSelector = (typeof KNOWN_METHODS)[number];

export type HexData = `0x${string}`;

export const MANIFEST_FINGERPRINT_TYPES = ["recipient", "relayer", "payer"] as const;
export type FingerprintType = (typeof MANIFEST_FINGERPRINT_TYPES)[number];
