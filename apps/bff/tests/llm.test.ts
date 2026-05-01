import { describe, expect, test } from "bun:test";
import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { fixtureAnalyticsDataSource } from "../src/data/analytics-source";
import { BffLlmInferenceError, resolveBffLlmService } from "../src/data/llm";
import { knownCustomerIntelligenceAddress } from "../src/data/phase-b-demo";

describe("BFF llm service", () => {
  test("sends an English and evidence-constrained Bedrock system prompt", async () => {
    const metrics =
      fixtureAnalyticsDataSource.getCustomerUpsellMetrics(knownCustomerIntelligenceAddress);

    if (!metrics) {
      throw new Error("Expected fixture upsell metrics for the known customer.");
    }

    let capturedCommandInput: { system?: Array<{ text?: string }> } | undefined;
    const client = {
      async send(command: { input: { system?: Array<{ text?: string }> } }) {
        capturedCommandInput = command.input;
        return {
          output: {
            message: {
              content: [
                {
                  text: JSON.stringify({
                    summary:
                      "This wallet appears to be a strong upsell candidate based on recent, multi-provider usage.",
                    reasons: [
                      "The wallet was active within the last day and has 9 observed transactions.",
                      "The wallet used 7 providers and is near the PoC free-tier threshold.",
                    ],
                    recommendedAction:
                      "Review whether higher-volume support or packaging would match the observed usage pattern.",
                    caution:
                      "Some inputs are PoC heuristics and should not be treated as literal commercial plan limits.",
                  }),
                },
              ],
            },
          },
        };
      },
    } as unknown as BedrockRuntimeClient;
    const service = resolveBffLlmService({
      client,
      modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
      region: "ap-northeast-1",
    });

    if (!service) {
      throw new Error("Expected Bedrock llm service to resolve.");
    }

    await service.generateUpsellExplanation(metrics);

    const systemPrompt = capturedCommandInput?.system?.[0]?.text;
    expect(systemPrompt).toBeTruthy();
    expect(systemPrompt).toContain("Write the output in English");
    expect(systemPrompt).toContain("Prefer cautious language");
    expect(systemPrompt).toContain("Do not infer customer intent");
    expect(systemPrompt).toContain("Do not mention exact deadlines");
    expect(systemPrompt).not.toContain("Write the output in Japanese");
  });

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
