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

test("Developer Build ist stabil und eindeutig gekennzeichnet", () => {
  const pkg = JSON.parse(read(path.join(ROOT,"package.json")));
  const manifest = JSON.parse(read(path.join(ROOT,"src","build-manifest.json")));
  assert.equal(pkg.version, "3.0.0");
  assert.equal(manifest.app_version, "2.1.0");
  assert.equal(manifest.build_id, "developer-architecture-3.0-final");
  assert.equal(manifest.release_channel, "final");
  assert.equal(manifest.feature_freeze, true);
});

test("gewünschte begriffliche Bereinigungen sind umgesetzt", () => {
  const html = read(path.join(ROOT,"src","frontend","index.html"));
  assert.doesNotMatch(html, /Einkommensvergleich strukturiert, nachvollziehbar und exportbereit erstellen/);
  assert.doesNotMatch(html, /Strukturhilfe einblenden|Strukturhilfe ausblenden/);
  assert.doesNotMatch(html, /id="valid-helper-box"|id="invalid-helper-box"/);
  assert.match(html, /id="ekv-valid-reason"/);
  assert.match(html, /id="ekv-invalid-reason"/);
});

test("Final enthält read only BFS Datenkontrolle und Export", () => {
  const html = read(path.join(ROOT,"src","frontend","index.html"));
  const source = read(path.join(ROOT,"src","frontend","features","data-inspector","data-inspector.js"));
  assert.match(html, /id="data-inspector"/);
  assert.match(html, /LSE TA01|BFS Datenkontrolle/);
  assert.match(html, /id="data-inspector-export-csv"/);
  assert.match(html, /id="data-inspector-export-json"/);
  assert.match(source, /DATA_INSPECTOR_DATASETS/);
  assert.match(source, /downloadDataInspectorFile/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("Final enthält sichere BFS Namensharmonisierung", () => {
  const source = read(path.join(ROOT,"src","backend","data","bfs","mappings","harmonization.mjs"));
  const aliases = JSON.parse(read(path.join(ROOT,"src","backend","data","branch-aliases.json")));
  assert.match(source, /extractNogaCode/);
  assert.match(source, /resolveCanonicalBranch/);
  assert.match(source, /status: "unresolved"/);
  assert.ok(Object.keys(aliases.aliases).length >= 3);
});

test("Daten Audit ist ohne offene Zuordnungen erfolgreich", () => {
  const output = execFileSync(process.execPath, [path.join(ROOT,"scripts","data_audit.js")], {cwd:ROOT, encoding:"utf8"});
  const result = JSON.parse(output);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(result.collisions, []);
});

test("Final Build ist reproduzierbar", () => {
  const files = ["index.html","assets/app.css","assets/data.bundle.js","assets/backend.bundle.js","assets/frontend.bundle.js","EKV Navigator starten.bat"];
  const dist = path.join(ROOT,"dist");
  execFileSync("python", [path.join(ROOT,"scripts","build.py")], {cwd:ROOT, stdio:"pipe"});
  const before = Object.fromEntries(files.map(f=>[f,sha(path.join(dist,f))]));
  execFileSync("python", [path.join(ROOT,"scripts","build.py")], {cwd:ROOT, stdio:"pipe"});
  const after = Object.fromEntries(files.map(f=>[f,sha(path.join(dist,f))]));
  assert.deepEqual(after,before);
});
