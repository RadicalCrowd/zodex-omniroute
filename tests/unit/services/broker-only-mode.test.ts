import assert from "node:assert/strict";
import test from "node:test";

import {
  getBrokerOnlyModelOverrideError,
  isBrokerOnlyModeEnabled,
} from "../../../open-sse/services/brokerOnlyMode.ts";
import { shouldUseFallback } from "../../../open-sse/services/emergencyFallback.ts";
import { getNextFamilyFallback } from "../../../open-sse/services/modelFamilyFallback.ts";

const ENV_KEY = "OMNIROUTE_BROKER_ONLY_MODE";
const originalValue = process.env[ENV_KEY];

test.afterEach(() => {
  if (originalValue === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalValue;
});

test("broker-only mode is disabled by default and only accepts explicit true values", () => {
  delete process.env[ENV_KEY];
  assert.equal(isBrokerOnlyModeEnabled(), false);

  for (const value of ["1", "true", "TRUE", " yes "]) {
    process.env[ENV_KEY] = value;
    assert.equal(isBrokerOnlyModeEnabled(), true, value);
  }

  for (const value of ["0", "false", "on", "invalid", ""]) {
    process.env[ENV_KEY] = value;
    assert.equal(isBrokerOnlyModeEnabled(), false, value);
  }
});

test("broker-only mode identifies model substitution and permits an exact match", () => {
  process.env[ENV_KEY] = "true";

  assert.equal(getBrokerOnlyModelOverrideError("cc/claude-a", "cc/claude-a"), null);
  assert.match(
    getBrokerOnlyModelOverrideError("cc/claude-a", "cc/claude-b") ?? "",
    /rejected model substitution/i
  );
});

test("broker-only mode disables family and emergency model fallback", () => {
  process.env[ENV_KEY] = "true";

  assert.equal(getNextFamilyFallback("cc/claude-opus-5", new Set(["cc/claude-opus-5"])), null);

  const emergency = shouldUseFallback(402, "payment required", false, {
    enabled: true,
    provider: "nvidia",
    model: "openai/gpt-oss-120b",
    triggerOn402: true,
    triggerOnBudgetKeywords: true,
    budgetKeywords: ["payment required"],
    skipForToolRequests: false,
    maxOutputTokens: 4096,
  });
  assert.deepEqual(emergency, {
    shouldFallback: false,
    reason: "broker-only mode preserves the requested model",
  });
});
