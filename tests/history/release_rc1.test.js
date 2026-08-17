"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(p, "utf8");
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const {
  WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
  WORKSPACE_STORE_SCHEMA_VERSION,
  migrateWorkspaceSnapshot,
  migrateWorkspaceStore
} = require("../src/storage/migrations.js");

test("RC1 ist als Release Candidate mit Feature Freeze gekennzeichnet", () => {
  const pkg = JSON.parse(read(path.join(ROOT, "package.json")));
  const manifest = JSON.parse(read(path.join(ROOT, "src", "build-manifest.json")));
  assert.equal(pkg.version, "2.1.0-rc.1");
  assert.equal(manifest.build_id, "rc1");
  assert.equal(manifest.release_channel, "release-candidate");
  assert.equal(manifest.feature_freeze, true);
});

test("RC1 portable Verweise zeigen ausschliesslich auf vorhandene lokale Dateien", () => {
  const dist = path.join(ROOT, "dist");
  const html = read(path.join(dist, "index.html"));
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.length >= 3);
  for (const ref of refs) {
    assert.equal(/^https?:\/\//i.test(ref), false, `externe Laufzeitreferenz: ${ref}`);
    if (ref.startsWith("#") || ref.startsWith("data:")) continue;
    assert.ok(fs.existsSync(path.join(dist, ref)), `lokale Datei fehlt: ${ref}`);
  }
  const launcher = read(path.join(dist, "EKV Navigator starten.bat"));
  assert.match(launcher, /index\.html/);
  assert.doesNotMatch(launcher, /npm|python|powershell|install|http\.server/i);
});

test("RC1 PDF Export behandelt Popup Blockierung ohne Nullzugriff", () => {
  const source = read(path.join(ROOT, "src", "export", "document-export.js"));
  assert.match(source, /const w = window\.open\("", "_blank"\);\s*if \(!w\)/s);
  assert.match(source, /Bitte erlaube Popups/);
});

test("Migration von Arbeitsstand Schema 1 bis Schema 4 erhält Kerndaten", () => {
  const legacy = {
    schemaVersion: 1,
    savedAt: "2025-01-01T12:00:00.000Z",
    activeTab: "legacy",
    fields: {
      "ekv-valid": "90000",
      "ekv-invalid": "45000",
      "ekv-method": "mixed",
      "ekv-employee-name": "Migration Test",
      "ekv-edit-date": "2025-01-01",
      "ekv-period-from": "2025-01-01",
      "ekv-valid-reason": "VE begründet",
      "ekv-invalid-reason": "IVE begründet"
    },
    ekvState: { validSource: "TA01", invalidSource: "TA11" },
    flowDetails: { valid: "VE Detail", invalid: "IVE Detail" },
    savedPeriods: [{ periodeVon: "2025-01-01", periodeBis: "", box3Html: "<div>Alt</div>" }]
  };
  const result = migrateWorkspaceSnapshot(legacy);
  assert.equal(result.snapshot.schemaVersion, WORKSPACE_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(result.snapshot.currentFormState.values["ekv-valid"], "90000");
  assert.equal(result.snapshot.summary.employeeName, "Migration Test");
  assert.equal(result.snapshot.summary.validIncome, 90000);
  assert.equal(result.snapshot.summary.invalidIncome, 45000);
  assert.equal(result.snapshot.summary.method, "mixed");
  assert.equal(result.snapshot.summary.periodCount, 1);
  assert.equal(result.snapshot.savedPeriods[0].schemaVersion, 2);
  assert.ok(result.snapshot.savedPeriods[0].id);
  assert.equal(result.migrated, true);
});

test("Migration eines Legacy Workspace Stores migriert mehrere Arbeitsstände und verwirft ungültige Einträge", () => {
  const raw = {
    "Fall A": { fields: { "ekv-valid": "60000", "ekv-invalid": "30000" }, savedPeriods: [] },
    "Fall B": { schemaVersion: 2, currentFormState: { values: { "ekv-valid": "70000", "ekv-invalid": "35000" } }, savedPeriods: [] },
    "": { fields: {} },
    "Defekt": "kein Objekt"
  };
  const result = migrateWorkspaceStore(raw);
  assert.equal(result.store.schemaVersion, WORKSPACE_STORE_SCHEMA_VERSION);
  assert.deepEqual(Object.keys(result.store.workspaces).sort(), ["Fall A", "Fall B"]);
  assert.equal(result.store.workspaces["Fall A"].schemaVersion, WORKSPACE_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(result.store.workspaces["Fall B"].schemaVersion, WORKSPACE_SNAPSHOT_SCHEMA_VERSION);
});

test("zukünftige unbekannte Speicherformate werden explizit abgelehnt", () => {
  assert.throws(() => migrateWorkspaceSnapshot({ schemaVersion: 99 }), /nicht unterstützt/);
  assert.throws(() => migrateWorkspaceStore({ schemaVersion: 99, workspaces: {} }), /nicht unterstützt/);
});

test("Build ist reproduzierbar", () => {
  const dist = path.join(ROOT, "dist");
  const files = ["index.html", "assets/app.css", "assets/data.bundle.js", "assets/frontend.bundle.js", "EKV Navigator starten.bat"];
  const before = Object.fromEntries(files.map(f => [f, sha(path.join(dist, f))]));
  execFileSync("python", [path.join(ROOT, "scripts", "build.py")], { cwd: ROOT, stdio: "pipe" });
  const after = Object.fromEntries(files.map(f => [f, sha(path.join(dist, f))]));
  assert.deepEqual(after, before);
});

test("RC1 Dokumentation enthält keine falsche aktuelle Alpha Kennzeichnung", () => {
  const readme = read(path.join(ROOT, "README.md"));
  const portable = read(path.join(ROOT, "src", "README_PORTABLE.txt"));
  assert.match(readme, /2\.1 RC1/);
  assert.match(portable, /2\.1 \| RC1/);
  assert.doesNotMatch(readme.split("## Status")[0], /Alpha 5|Alpha 6/);
});
