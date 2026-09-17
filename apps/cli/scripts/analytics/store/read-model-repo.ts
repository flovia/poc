export type ServiceAnalyticsRow = {
  service_key: string;
  service_name: string;
  sink_key: string;
  endpoint_attribution_status: string;
  confidence: number;
  resource_count: number;
  transaction_count: number;
  unique_sender_count: number;
};
