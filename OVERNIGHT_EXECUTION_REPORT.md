# Overnight Execution Report

Date: 2026-08-16

## Completed Deliverables

- Added a hardened, disabled-by-default per-user installer at
  `scripts/zodex/install-user-service.mjs` with documentation and regression tests.
- Installed the verified standalone artifact as release `066501315421` under
  `~/.local/share/zodex-omniroute/app/releases/` and recorded content-tree SHA-256
  `9b5ebb885e8dba574ed0557e58a3dfc64fd97e8b803cc1a71cd576c8b2b4bccb`.
- Generated independent local secrets in `~/.config/zodex/omniroute.env` without
  printing, logging, or committing their values. The environment is mode `0600` and
  runtime/install directories are mode `0700`.
- Installed `zodex-omniroute.service` as a user unit with `UMask=0077`, an empty
  capability set, `NoNewPrivileges`, read-only system/home/application access except
  for its dedicated state path, private temporary/device namespaces, and kernel,
  namespace, ABI, and address-family restrictions.
- Verified the installed artifact hash matches the built candidate and that only
  `.env.example` exists in the release root; runtime `.env` and `server.env` files are
  excluded.
- Temporarily booted the service twice without provider credentials. The final boot
  listened only on `127.0.0.1` (`20128`, `20131`, and `20132`), returned `401` for the
  protected health/API surface without a key, and created only `0600` files inside
  `0700` state directories.
- Verified all six generated secret values were absent from runtime state and the
  systemd journal. No secret value was emitted during verification.
- Explicitly disabled unrelated Arena, pricing, free-proxy, development-model, and
  CLI-profile synchronization. A recognized earlier Zodex-generated environment is
  migrated additively while preserving its secret lines; unknown environments fail
  closed.
- Validated the unit with `systemd-analyze verify`; `systemd-analyze security` rated it
  `3.3 OK`.
- Left the final service state `loaded`, `disabled`, `inactive`, and non-listening.
- Ran 16 focused regressions: 16 passed, 0 failed. ESLint, Prettier, syntax checking,
  diff checks, strict documentation checks, and repository commit hooks passed under
  Node.js `22.23.2`.
- Re-ran the broker-only unit test and Zodex service-installer test: both passed. Ran
  `tests/integration/codex-chat-reasoning-http-e2e.test.ts` against a temporary local
  mock upstream in the host namespace: passed. The test confirms `reasoning_effort`
  is forwarded to the Responses request, reasoning deltas reach the client SSE, and
  encrypted reasoning content is not exposed.
- Ran Codex Router doctor in the host namespace: no `FAIL` results, Router health
  `0.4.0-beta.3`, native Codex sign-in authenticated, and 18 routed catalog entries.
  The existing `[kiloFree]` and `[OpencodeFree]` descriptions remain present.
- Created commits `ab42b0acc`, `a369b8388`, and `2a1592667` on
  `feature/zodex-broker-only`.
- Did not modify `~/.codex`, provider selections, Codex models/profiles/settings,
  ChatGPT login artifacts, or the installed Codex Desktop package. Codex was not
  restarted.

## Assumptions Made

- “Continue overnight” authorizes reversible non-interactive implementation and a
  disabled user-scoped installation, but does not authorize entering account
  credentials, accepting OAuth scopes for the owner, consuming provider quota, or
  restarting Codex Desktop.
- Because `~/.config/zodex/config.json` is absent and no warning acknowledgements have
  been recorded, the correct final service state is disabled and inactive.
- The exact Node.js `22.23.2` binary already used by Codex Router is the stable runtime
  to pin in the systemd unit; the shell-default Node.js 20 remains unsupported.
- OAuth health/refresh handling related to connected accounts should remain available,
  while unrelated public leaderboard and catalog synchronization should be explicitly
  disabled for the broker-only profile.
- Existing Kilo Free, OpenCode Free, and native ChatGPT behavior is authoritative and
  must not be changed merely to complete OmniRoute preparation.

## Errors & Follow-ups

- The restricted sandbox could not reach the user systemd bus. Installation files were
  already complete, and `daemon-reload` was retried successfully in the host namespace.
- The first generated unit quoted path directives that systemd treats literally,
  producing `LoadState=bad-setting`. Path directives now use systemd-safe escapes;
  unit validation and a regression assertion pass.
- The first shell health poll used zsh's reserved `status` variable and was retried with
  a task-specific name.
- A sandbox-namespace health poll could not see the host listener. The host-namespace
  probe succeeded and confirmed loopback-only sockets.
- The first smoke boot performed one stock Arena leaderboard synchronization before the
  opt-out was added. It used no provider credentials or model quota. The recognized
  environment migration now sets `ARENA_ELO_SYNC_ENABLED=false`; the second boot logged
  the synchronization as disabled.
- `gitleaks` is not installed, so `npm run check:secrets` reported a graceful skip.
  Repository tracked-artifact checks and exact-value runtime secret scans passed.
- Documentation validation continues to report three pre-existing soft count drifts
  and 62 advisory version-like references; all strict documentation gates pass.
- Provider OAuth remains intentionally incomplete. The account owner must first record
  both Zodex warning acknowledgements, start the local service, sign in only through the
  loopback dashboard, and review the provider scopes. No OAuth material should be sent
  through chat.
- An inference-only endpoint key must still be created locally and stored through Zodex
  Router's protected credential flow. The router provider must then be promoted
  additively without changing Kilo Free, OpenCode Free, defaults, or native login.
- Any real provider compatibility request, including text, streaming, tools, reasoning,
  cancellation, or quota inspection, remains a separate quota-consuming gate.
- The local reasoning-stream contract is verified, but whether a specific Claude OAuth
  model emits a Codex-renderable reasoning summary still requires a real provider probe.
- The final Codex Desktop restart remains the owner's action.
