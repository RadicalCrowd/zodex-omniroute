---
title: "Zodex User Service"
---

# Zodex User Service

The Zodex fork includes `scripts/zodex/install-user-service.mjs` for installing a built
standalone artifact as a hardened per-user service. The installer is deliberately
disabled-by-default: it writes the unit and reloads systemd only when requested, but it
never enables or starts the service.

Run it from the pinned Zodex OmniRoute checkout with Node.js 22 or newer:

```bash
node scripts/zodex/install-user-service.mjs \
  --artifact .build/next/standalone \
  --node /absolute/path/to/node \
  --reload-systemd
```

The installation uses these locations by default:

- application releases: `~/.local/share/zodex-omniroute/app/releases/`;
- active release symlink: `~/.local/share/zodex-omniroute/app/current`;
- encrypted runtime state: `~/.local/share/zodex-omniroute/state`;
- protected environment: `~/.config/zodex/omniroute.env`;
- user unit: `~/.config/systemd/user/zodex-omniroute.service`.

The generated environment binds `OMNIROUTE_SERVER_HOST` and `HOSTNAME` to
`127.0.0.1`, sets `REQUIRE_API_KEY=true`, enables `OMNIROUTE_BROKER_ONLY_MODE`,
disables `OMNIROUTE_EMERGENCY_FALLBACK`, and generates independent local secrets.
Unrelated Arena, pricing, free-proxy, development-model, and CLI-profile synchronization
is explicitly disabled; OAuth credential health and on-demand token handling remain available.
The environment and unit are mode `0600`; state and installation roots are mode
`0700`. Runtime `.env` files are excluded from copied artifacts.

The generated systemd unit applies `UMask=0077`, `NoNewPrivileges=true`, private
temporary and device namespaces, read-only home/application access except for the
dedicated state directory, kernel and namespace restrictions, and an empty capability
set. It executes the exact Node binary supplied during installation.

After installation, verify the inactive default:

```bash
systemctl --user is-enabled zodex-omniroute.service
systemctl --user is-active zodex-omniroute.service
```

Do not enable or start the service until the Zodex config contains both warning
acknowledgements. Provider OAuth must be completed by the account owner directly in
the loopback dashboard. Never copy authorization codes, API keys, endpoint keys,
cookies, or environment-file contents into chat, command arguments, logs, or issue
reports.
