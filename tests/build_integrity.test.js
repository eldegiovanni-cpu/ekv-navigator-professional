"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const REF = path.join(ROOT, "reference", "EKV_Navigator_IV_2.1_Reference.html");
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");

const read = p => fs.readFileSync(p, "utf8");
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

function extractReference() {
  const html = read(REF);
  const style = html.match(/<style>\s*([\s\S]*?)\s*<\/style>/)[1].trim();
  const meta = JSON.parse(html.match(/const APP_METADATA = Object\.freeze\((\{.*?\})\);/s)[1]);
  const base = JSON.parse(html.match(/const DATA = (\{.*?\});\s*\n\s*\/\* Modul: src\/data\/data-runtime\.js \*\//s)[1]);
  const ta11 = JSON.parse(html.match(/const TA11_MODE = (\{.*?\});\s*\n\s*DATA\.modes\.TA11 = TA11_MODE;/s)[1]);
  return { html, style, meta, base, ta11 };
}

test("Referenzdatei ist unverändert versioniert", () => {
  const expected = read(path.join(ROOT, "docs", "REFERENCE_SHA256.txt")).trim().split(/\s+/)[0];
  assert.equal(sha(REF), expected);
});

test("2.1 Referenzdaten bleiben als eingefrorene Golden Baseline erhalten", () => {
  const ref = extractReference();
  const frozenBase = JSON.parse(read(path.join(ROOT,"tests","golden","reference-data-2.1","base-data.json")));
  const frozenTa11 = JSON.parse(read(path.join(ROOT,"tests","golden","reference-data-2.1","ta11-data.json")));
  assert.deepEqual(frozenBase, ref.base);
  assert.deepEqual(frozenTa11, ref.ta11);
  assert.deepEqual(JSON.parse(read(path.join(SRC,"config","app-metadata.json"))), ref.meta);
});

test("Produktive BFS Datenbasis ist als Rohdatenabgleich RC1.2 versioniert", () => {
  const base = JSON.parse(read(path.join(SRC,"backend","data","base-data.json")));
  const ta11 = JSON.parse(read(path.join(SRC,"backend","data","ta11-data.json")));
  assert.equal(base.dataQuality.version, "2026-08-17-raw-bfs-reconciliation-v1");
  assert.deepEqual(Object.keys(base.modes.TA01.lseData).sort(), ["2012","2014","2016","2018","2020","2022","2024"]);
  assert.deepEqual(Object.keys(base.modes.T17.lseData).sort(), ["2012","2014","2016","2018","2020","2022","2024"]);
  assert.deepEqual(Object.keys(ta11.lseData || ta11).sort(), ["2006","2008","2010","2012","2014","2016","2018","2020","2022","2024"]);
});

test("Referenz CSS Kern bleibt nach Design System Migration funktional abgedeckt", () => {
  const manifest = JSON.parse(read(path.join(SRC,"build-manifest.json")));
  const combined = manifest.style_order.map(name => read(path.join(SRC,"frontend","styles",name))).join("\n");
  assert.equal(manifest.style_order[0], "00-design-tokens.css");
  assert.ok(manifest.style_order.includes("20-application-shell.css"));
  assert.ok(manifest.style_order.includes("50-professional-components.css"));
  assert.ok(manifest.style_order.includes("60-workspaces.css"));
  assert.ok(manifest.style_order.includes("70-data-inspector.css"));
  [".card", ".ekvp-hero", ".ekv-flow-grid", ".workspace-details", ".status-chip", ".period-card"].forEach(selector => {
    assert.ok(combined.includes(selector), `Referenz Stylebaustein fehlt: ${selector}`);
  });
  assert.doesNotMatch(combined, /theme-sva-red|theme-sva-blue/);
});

test("HTML Struktur behält alle Referenz IDs", () => {
  const refShell = extractReference().html.replace(/<style>[\s\S]*?<\/style>/i, "").replace(/<script>[\s\S]*?<\/script>/i, "");
  const refIds = [...refShell.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const distHtml = read(path.join(DIST,"index.html"));
  const distIds = [...distHtml.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const duplicates = distIds.filter((id, index) => distIds.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
  const intentionallyRemoved = new Set(["toggle-valid-helper", "valid-helper-box", "toggle-invalid-helper", "invalid-helper-box"]);
  for (const id of refIds) {
    if (intentionallyRemoved.has(id)) continue;
    assert.ok(distIds.includes(id), `Referenz ID fehlt: ${id}`);
  }
  assert.equal(/<style>/i.test(distHtml), false);
  assert.equal(/<script>(?!\s*$)/i.test(distHtml), false);
  assert.match(distHtml, /assets\/app\.css/);
  assert.match(distHtml, /assets\/data\.bundle\.js/);
  assert.match(distHtml, /assets\/backend\.bundle\.js/);
  assert.match(distHtml, /assets\/frontend\.bundle\.js/);
});

test("Portable Build enthält keine externen Laufzeitabhängigkeiten", () => {
  const html = read(path.join(DIST,"index.html"));
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(urls.length >= 3);
  assert.equal(urls.some(u => /^https?:\/\//i.test(u)), false);
});

test("Datenbundle enthält exakt die aktuelle freigegebene Source Datenbasis inklusive T11", () => {
  const ref = extractReference();
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read(path.join(DIST,"assets","data.bundle.js")), sandbox);
  const expected = JSON.parse(read(path.join(SRC,"backend","data","base-data.json")));
  expected.modes.TA11 = JSON.parse(read(path.join(SRC,"backend","data","ta11-data.json")));
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.__EKV_DATA__)), expected);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.__EKV_APP_METADATA__)), ref.meta);
});

test("Anwendungsbundle und Datenbundle sind syntaktisch gültig", () => {
  execFileSync(process.execPath, ["--check", path.join(DIST,"assets","data.bundle.js")]);
  execFileSync(process.execPath, ["--check", path.join(DIST,"assets","backend.bundle.js")]);
  execFileSync(process.execPath, ["--check", path.join(DIST,"assets","frontend.bundle.js")]);
});

test("verbindliche letzte UI Anpassungen sind im modularen Stand vorhanden", () => {
  const html = read(path.join(DIST,"index.html"));
  assert.match(html, /Bitte kontrollieren oder Löschen – Älter als 30 Tage/);
  assert.match(html, /Lohn manuell festgelegt/);
  assert.doesNotMatch(html, /by Eros De Giovanni/i);
  assert.doesNotMatch(html, />\s*Datenverwaltung\s*</i);
});
