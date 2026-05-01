import { describe, expect, test } from "bun:test";
import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { fixtureAnalyticsDataSource } from "../src/data/analytics-source";
import { BffLlmInferenceError, resolveBffLlmService } from "../src/data/llm";
import { knownCustomerIntelligenceAddress } from "../src/data/phase-b-demo";

describe("BFF llm service", () => {
  test("includes Bedrock cause details when inference fails", async () => {
    const metrics =
      fixtureAnalyticsDataSource.getCustomerUpsellMetrics(knownCustomerIntelligenceAddress);

    if (!metrics) {
      throw new Error("Expected fixture upsell metrics for the known customer.");
    }

    const cause = Object.assign(new Error("You don't have access to this model"), {
      name: "AccessDeniedException",
    });
    const client = {
      async send() {
        throw cause;
      },
    } as unknown as BedrockRuntimeClient;
    const service = resolveBffLlmService({
      client,
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      region: "ap-northeast-1",
    });

    if (!service) {
      throw new Error("Expected Bedrock llm service to resolve.");
    }

    try {
      await service.generateUpsellExplanation(metrics);
      throw new Error("Expected Bedrock inference to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(BffLlmInferenceError);
      expect((error as Error).message).toContain("Bedrock upsell explanation inference failed.");
      expect((error as Error).message).toContain("AccessDeniedException");
      expect((error as Error).message).toContain("You don't have access to this model");
    }
  });
});
