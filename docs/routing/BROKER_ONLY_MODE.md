---
title: "Zodex Broker-Only Mode"
---

# Zodex Broker-Only Mode

Zodex uses OmniRoute as a local OAuth broker without allowing it to select a
different model. This fork adds the environment-only
`OMNIROUTE_BROKER_ONLY_MODE` switch. It is disabled by default and is not
registered in the dashboard feature-flag list.

Enable it in OmniRoute's process configuration:

```dotenv
OMNIROUTE_BROKER_ONLY_MODE=true
```

When enabled, an explicit `provider/model` request keeps its model through the
request pipeline. The mode disables task-aware, web-search, reasoning, auto,
combo, background-degradation, deprecated-alias, model-family, and emergency
model substitution. Requests that name an auto route, combo, no-think alias, or
discovery alias are rejected instead of resolved. A configured guardrail or
hook that tries to replace the model is also rejected.

OAuth token refresh and account retry remain available. Account retry may use a
different connection for the same provider and model; it does not authorize a
different model. Provider namespace parsing still removes the local routing
prefix before the provider request, so `cc/<model>` reaches the Claude Code
executor as `<model>`.

The implementation is in
[`open-sse/services/brokerOnlyMode.ts`](../../open-sse/services/brokerOnlyMode.ts),
with enforcement in [`src/sse/handlers/chat.ts`](../../src/sse/handlers/chat.ts)
and [`open-sse/handlers/chatCore.ts`](../../open-sse/handlers/chatCore.ts).
