export type X402EndpointCategory = "Extract" | "Search" | "Analyze" | "Transact";

export type X402PaymentStatus = "required" | "paid" | "settled" | "failed";

export type X402ErrorType =
  | "payment_verification_failed"
  | "insufficient_funds"
  | "api_timeout"
  | "provider_5xx"
  | "invalid_signature"
  | "none";

export type X402MetricMode = "flow_count" | "settled_usdc";

export type X402WorkflowStage = "before_target" | "target" | "after_target";

export type X402CategoryDefinition = {
  category: X402EndpointCategory;
  display_label?: string;
  description: string;
};

export type X402RequestEvent = {
  event_id: string;
  workflow_id: string;
  step_order: number;
  workflow_stage: X402WorkflowStage;
  timestamp: string;
  user_intent: string;
  buyer_type: string;
  buyer_wallet_hash: string;
  seller_wallet_hash: string;
  api_intermediary: string;
  provider: string;
  endpoint: string;
  endpoint_category: X402EndpointCategory;
  amount_usdc: number;
  network: string;
  token: "USDC";
  payment_status: X402PaymentStatus;
  http_status: number;
  latency_ms: number;
  error_type: X402ErrorType;
};

export type EndpointMasterRow = {
  endpoint: string;
  endpoint_category: X402EndpointCategory;
  endpoint_subcategory: string;
  provider: string;
  pricing_model: string;
};

export type SankeyFlowDailyRow = {
  date: string;
  from_category: X402EndpointCategory;
  api_intermediary: string;
  to_category: X402EndpointCategory;
  flow_count: number;
  paid_count: number;
  settled_usdc: number;
  success_rate: number;
  p95_latency_ms: number;
  error_rate: number;
  network: string;
};

export type X402MockDataset = {
  x402_request_events: X402RequestEvent[];
  endpoint_master: EndpointMasterRow[];
  sankey_flows_daily: SankeyFlowDailyRow[];
};
