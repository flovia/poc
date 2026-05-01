import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { fixtureAnalyticsDataSource } from "../src/data/analytics-source";
import { BffLlmInferenceError, resolveBffLlmService } from "../src/data/llm";
import { knownCustomerIntelligenceAddress } from "../src/data/phase-b-demo";

const withTempDir = async (prefix: string, fn: (directory: string) => Promise<void> | void) => {
  const directory = path.join(os.tmpdir(), `bff-llm-${prefix}-${randomUUID()}`);
  fs.mkdirSync(directory, { recursive: true });
  try {
    await Promise.resolve(fn(directory));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

describe("BFF llm service", () => {
  test("reuses cached Bedrock explanations for the same branch, model, and input", async () =>
    withTempDir("cache-hit", async (cacheDirectory) => {
      const metrics =
        fixtureAnalyticsDataSource.getCustomerUpsellMetrics(knownCustomerIntelligenceAddress);

      if (!metrics) {
        throw new Error("Expected fixture upsell metrics for the known customer.");
      }

      let sendCalls = 0;
      const client = {
        async send() {
          sendCalls += 1;
          return {
            output: {
              message: {
                content: [
                  {
                    text: JSON.stringify({
                      summary: `Cached response ${sendCalls}`,
                      reasons: [
                        "The wallet appears active based on recent observed transactions.",
                        "The wallet used multiple providers in the observed read model.",
                      ],
                      recommendedAction:
                        "Review whether the observed usage pattern matches a higher-support offering.",
                      caution:
                        "Some metrics come from PoC heuristics and should be treated cautiously.",
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
        branchName: "develop",
        cacheDirectory,
      });

      if (!service) {
        throw new Error("Expected Bedrock llm service to resolve.");
      }

      const first = await service.generateUpsellExplanation(metrics);
      const second = await service.generateUpsellExplanation(metrics);

      expect(sendCalls).toBe(1);
      expect(second).toEqual(first);
    }));

  test("cache key varies by branch name, model, and input", async () =>
    withTempDir("cache-key", async (cacheDirectory) => {
      const metrics =
        fixtureAnalyticsDataSource.getCustomerUpsellMetrics(knownCustomerIntelligenceAddress);

      if (!metrics) {
        throw new Error("Expected fixture upsell metrics for the known customer.");
      }

      let sendCalls = 0;
      const client = {
        async send() {
          sendCalls += 1;
          return {
            output: {
              message: {
                content: [
                  {
                    text: JSON.stringify({
                      summary: `Response ${sendCalls}`,
                      reasons: [
                        "The wallet appears active based on recent observed transactions.",
                        "The wallet used multiple providers in the observed read model.",
                      ],
                      recommendedAction:
                        "Review whether the observed usage pattern matches a higher-support offering.",
                      caution:
                        "Some metrics come from PoC heuristics and should be treated cautiously.",
                    }),
                  },
                ],
              },
            },
          };
        },
      } as unknown as BedrockRuntimeClient;
      const buildService = (options: { branchName: string; modelId: string }) =>
        resolveBffLlmService({
          client,
          modelId: options.modelId,
          region: "ap-northeast-1",
          branchName: options.branchName,
          cacheDirectory,
        });

      const defaultService = buildService({
        branchName: "develop",
        modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
      });
      const branchVariantService = buildService({
        branchName: "main",
        modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
      });
      const modelVariantService = buildService({
        branchName: "develop",
        modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      });

      if (!defaultService || !branchVariantService || !modelVariantService) {
        throw new Error("Expected Bedrock llm services to resolve.");
      }

      await defaultService.generateUpsellExplanation(metrics);
      await defaultService.generateUpsellExplanation(metrics);
      await branchVariantService.generateUpsellExplanation(metrics);
      await modelVariantService.generateUpsellExplanation(metrics);
      await defaultService.generateUpsellExplanation({
        ...metrics,
        sourceGeneratedAt: "2026-05-01T00:00:00.000Z",
      });

      expect(sendCalls).toBe(4);
    }));

  test("invalidates cached explanations after the TTL or when the deploy scope changes", async () =>
    withTempDir("cache-invalidation", async (cacheDirectory) => {
      const metrics =
        fixtureAnalyticsDataSource.getCustomerUpsellMetrics(knownCustomerIntelligenceAddress);

      if (!metrics) {
        throw new Error("Expected fixture upsell metrics for the known customer.");
      }

      let sendCalls = 0;
      let now = Date.parse("2026-05-01T00:00:00.000Z");
      const client = {
        async send() {
          sendCalls += 1;
          return {
            output: {
              message: {
                content: [
                  {
                    text: JSON.stringify({
                      summary: `Response ${sendCalls}`,
                      reasons: [
                        "The wallet appears active based on recent observed transactions.",
                        "The wallet used multiple providers in the observed read model.",
                      ],
                      recommendedAction:
                        "Review whether the observed usage pattern matches a higher-support offering.",
                      caution:
                        "Some metrics come from PoC heuristics and should be treated cautiously.",
                    }),
                  },
                ],
              },
            },
          };
        },
      } as unknown as BedrockRuntimeClient;
      const buildService = (options: { deploymentId: string; runtimeInstanceId: string }) =>
        resolveBffLlmService({
          client,
          modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
          region: "ap-northeast-1",
          branchName: "develop",
          cacheDirectory,
          cacheTtlMs: 86_400_000,
          deploymentId: options.deploymentId,
          runtimeInstanceId: options.runtimeInstanceId,
          now: () => now,
        });

      const initialService = buildService({
        deploymentId: "deploy-a",
        runtimeInstanceId: "runtime-a",
      });

      if (!initialService) {
        throw new Error("Expected initial Bedrock llm service to resolve.");
      }

      await initialService.generateUpsellExplanation(metrics);
      now += 60_000;
      await initialService.generateUpsellExplanation(metrics);
      now += 86_400_001;
      await initialService.generateUpsellExplanation(metrics);

      const deployVariantService = buildService({
        deploymentId: "deploy-b",
        runtimeInstanceId: "runtime-a",
      });
      const runtimeVariantService = buildService({
        deploymentId: "deploy-b",
        runtimeInstanceId: "runtime-b",
      });

      if (!deployVariantService || !runtimeVariantService) {
        throw new Error("Expected variant Bedrock llm services to resolve.");
      }

      await deployVariantService.generateUpsellExplanation(metrics);
      await runtimeVariantService.generateUpsellExplanation(metrics);

      expect(sendCalls).toBe(4);
    }));

  test("sends an English and evidence-constrained Bedrock system prompt", async () =>
    withTempDir("system-prompt", async (cacheDirectory) => {
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
        cacheDirectory,
      });

      if (!service) {
        throw new Error("Expected Bedrock llm service to resolve.");
      }

      await service.generateUpsellExplanation(metrics);

      const systemPrompt = capturedCommandInput?.system?.[0]?.text;
      expect(systemPrompt).toBeTruthy();
      expect(systemPrompt).toContain("Write the output in English");
      expect(systemPrompt).toContain('"summary" must be a short headline of 3 to 6 words.');
      expect(systemPrompt).toContain("Prefer cautious language");
      expect(systemPrompt).toContain("Do not infer customer intent");
      expect(systemPrompt).toContain("Do not mention exact deadlines");
      expect(systemPrompt).not.toContain("Write the output in Japanese");
    }));

  test("includes Bedrock cause details when inference fails", async () =>
    withTempDir("inference-error", async (cacheDirectory) => {
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
        cacheDirectory,
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
    }));
});
