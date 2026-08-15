import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const { installUserService } = await import("../../scripts/zodex/install-user-service.mjs");

function mode(filePath: string) {
  return fs.statSync(filePath).mode & 0o777;
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zodex-user-service-"));
  const artifact = path.join(root, "artifact");
  fs.mkdirSync(path.join(artifact, "scripts/dev"), { recursive: true });
  fs.writeFileSync(path.join(artifact, "server-ws.mjs"), "// server\n");
  fs.writeFileSync(path.join(artifact, "scripts/dev/run-standalone.mjs"), "// launcher\n");
  fs.writeFileSync(path.join(artifact, ".env"), "SECRET=must-not-install\n");
  fs.writeFileSync(path.join(artifact, ".env.local"), "SECRET=must-not-install\n");
  fs.writeFileSync(path.join(artifact, "server.env"), "SECRET=must-not-install\n");
  fs.writeFileSync(path.join(artifact, ".env.example"), "SAFE_TEMPLATE=\n");
  const nodeBinary = path.join(root, "node");
  fs.writeFileSync(nodeBinary, "#!/bin/sh\n", { mode: 0o755 });
  return { root, artifact, nodeBinary };
}

test("installs a private, disabled, fail-closed user service and is idempotent", () => {
  const fixture = createFixture();
  try {
    const options = {
      artifactDir: fixture.artifact,
      nodeBinary: fixture.nodeBinary,
      releaseId: "test-release",
      installRoot: path.join(fixture.root, "install"),
      zodexConfigDir: path.join(fixture.root, "config"),
      unitDir: path.join(fixture.root, "units"),
      reloadSystemd: false,
    };
    const first = installUserService(options);
    const envBefore = fs.readFileSync(first.envFile, "utf8");
    const service = fs.readFileSync(first.unitFile, "utf8");

    assert.equal(first.releaseCreated, true);
    assert.equal(first.environmentCreated, true);
    assert.equal(first.environmentMigrated, false);
    assert.equal(first.enabledByInstaller, false);
    assert.equal(first.startedByInstaller, false);
    assert.equal(mode(first.dataDir), 0o700);
    assert.equal(mode(first.envFile), 0o600);
    assert.equal(mode(first.unitFile), 0o600);
    assert.equal(fs.readlinkSync(first.currentDir), "releases/test-release");
    assert.equal(fs.existsSync(path.join(first.releaseDir, ".env")), false);
    assert.equal(fs.existsSync(path.join(first.releaseDir, ".env.local")), false);
    assert.equal(fs.existsSync(path.join(first.releaseDir, "server.env")), false);
    assert.equal(fs.existsSync(path.join(first.releaseDir, ".env.example")), true);
    assert.match(envBefore, /OMNIROUTE_SERVER_HOST="127\.0\.0\.1"/);
    assert.match(envBefore, /REQUIRE_API_KEY="true"/);
    assert.match(envBefore, /OMNIROUTE_BROKER_ONLY_MODE="true"/);
    assert.match(envBefore, /OMNIROUTE_EMERGENCY_FALLBACK="false"/);
    assert.match(envBefore, /ARENA_ELO_SYNC_ENABLED="false"/);
    assert.doesNotMatch(envBefore, /CHANGEME/);
    const generatedSecrets = [
      "JWT_SECRET",
      "API_KEY_SECRET",
      "STORAGE_ENCRYPTION_KEY",
      "MACHINE_ID_SALT",
      "OMNIROUTE_WS_BRIDGE_SECRET",
      "INITIAL_PASSWORD",
    ].map((name) => envBefore.match(new RegExp(`^${name}="([a-f0-9]{64})"$`, "m"))?.[1]);
    assert.equal(generatedSecrets.every(Boolean), true);
    assert.equal(new Set(generatedSecrets).size, generatedSecrets.length);
    assert.match(service, /UMask=0077/);
    assert.match(service, /NoNewPrivileges=true/);
    assert.match(service, /ProtectSystem=strict/);
    assert.match(service, /ProtectHome=read-only/);
    assert.match(
      service,
      new RegExp(`WorkingDirectory=${first.currentDir.replaceAll("/", "\\/")}`)
    );
    assert.doesNotMatch(service, /WorkingDirectory="/);
    assert.doesNotMatch(service, /JWT_SECRET|STORAGE_ENCRYPTION_KEY|INITIAL_PASSWORD/);

    const second = installUserService(options);
    assert.equal(second.releaseCreated, false);
    assert.equal(second.environmentCreated, false);
    assert.equal(second.environmentMigrated, false);
    assert.equal(fs.readFileSync(second.envFile, "utf8"), envBefore);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("migrates only a recognized older generated environment and preserves its secrets", () => {
  const fixture = createFixture();
  try {
    const options = {
      artifactDir: fixture.artifact,
      nodeBinary: fixture.nodeBinary,
      releaseId: "migration-test",
      installRoot: path.join(fixture.root, "install"),
      zodexConfigDir: path.join(fixture.root, "config"),
      unitDir: path.join(fixture.root, "units"),
      reloadSystemd: false,
    };
    const first = installUserService(options);
    const current = fs.readFileSync(first.envFile, "utf8");
    const older = current
      .split(/\r?\n/)
      .filter(
        (line) =>
          !line.startsWith("ARENA_ELO_SYNC_ENABLED=") &&
          !line.startsWith("PRICING_SYNC_ENABLED=") &&
          !line.startsWith("FREE_PROXY_AUTO_SYNC_ENABLED=") &&
          !line.startsWith("MODELS_DEV_SYNC_ENABLED=") &&
          !line.startsWith("OMNIROUTE_AUTO_SYNC_CODEX_PROFILES=") &&
          !line.startsWith("OMNIROUTE_AUTO_SYNC_CLAUDE_PROFILES=")
      )
      .join("\n");
    fs.writeFileSync(first.envFile, older, { mode: 0o600 });

    const migrated = installUserService(options);
    const after = fs.readFileSync(first.envFile, "utf8");
    assert.equal(migrated.environmentMigrated, true);
    assert.match(after, /ARENA_ELO_SYNC_ENABLED="false"/);
    for (const name of [
      "JWT_SECRET",
      "API_KEY_SECRET",
      "STORAGE_ENCRYPTION_KEY",
      "MACHINE_ID_SALT",
      "OMNIROUTE_WS_BRIDGE_SECRET",
      "INITIAL_PASSWORD",
    ]) {
      assert.equal(
        after.match(new RegExp(`^${name}=.*$`, "m"))?.[0],
        current.match(new RegExp(`^${name}=.*$`, "m"))?.[0]
      );
    }
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("rejects incomplete artifacts and unsafe existing environments", () => {
  const fixture = createFixture();
  try {
    fs.rmSync(path.join(fixture.artifact, "server-ws.mjs"));
    assert.throws(
      () =>
        installUserService({
          artifactDir: fixture.artifact,
          nodeBinary: fixture.nodeBinary,
          releaseId: "invalid-artifact",
          installRoot: path.join(fixture.root, "install-a"),
          zodexConfigDir: path.join(fixture.root, "config-a"),
          unitDir: path.join(fixture.root, "units-a"),
        }),
      /missing server-ws\.mjs/
    );

    fs.writeFileSync(path.join(fixture.artifact, "server-ws.mjs"), "// server\n");
    const configDir = path.join(fixture.root, "config-b");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, "omniroute.env"), "REQUIRE_API_KEY=false\n", {
      mode: 0o600,
    });
    assert.throws(
      () =>
        installUserService({
          artifactDir: fixture.artifact,
          nodeBinary: fixture.nodeBinary,
          releaseId: "unsafe-env",
          installRoot: path.join(fixture.root, "install-b"),
          zodexConfigDir: configDir,
          unitDir: path.join(fixture.root, "units-b"),
        }),
      /not a recognized Zodex-generated environment/
    );

    fs.writeFileSync(
      path.join(configDir, "omniroute.env"),
      "# Generated by the Zodex OmniRoute user-service installer.\nREQUIRE_API_KEY=false\n",
      { mode: 0o600 }
    );
    assert.throws(
      () =>
        installUserService({
          artifactDir: fixture.artifact,
          nodeBinary: fixture.nodeBinary,
          releaseId: "unsafe-recognized-env",
          installRoot: path.join(fixture.root, "install-c"),
          zodexConfigDir: configDir,
          unitDir: path.join(fixture.root, "units-c"),
        }),
      /must set HOSTNAME=127\.0\.0\.1/
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
