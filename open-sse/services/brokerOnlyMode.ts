/**
 * Zodex broker-only mode.
 *
 * This mode is intentionally environment-only: it is disabled by default and
 * cannot be enabled from OmniRoute's dashboard. When enabled, request handling
 * must preserve an explicitly requested model instead of selecting aliases,
 * combos, smart routes, or fallback models.
 */

const BROKER_ONLY_ENV_KEY = "OMNIROUTE_BROKER_ONLY_MODE";
const ENABLED_VALUES = new Set(["1", "true", "yes"]);

export function isBrokerOnlyModeEnabled(): boolean {
  const value = process.env[BROKER_ONLY_ENV_KEY];
  return typeof value === "string" && ENABLED_VALUES.has(value.trim().toLowerCase());
}

export function getBrokerOnlyModelOverrideError(
  requestedModel: string,
  candidateModel: unknown
): string | null {
  if (!isBrokerOnlyModeEnabled() || typeof candidateModel !== "string") return null;
  if (candidateModel === requestedModel) return null;

  return `Broker-only mode rejected model substitution: ${requestedModel} -> ${candidateModel}`;
}
