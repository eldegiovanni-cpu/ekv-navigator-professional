"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(p, "utf8");

test("Phase 4 HTML enthält geführten Dreischritt ohne Fachfelder zu entfernen", () => {
  const html = read(path.join(ROOT, "src", "frontend", "index.html"));
  assert.match(html, /id="phase4-workflow"/);
  assert.match(html, /1\. Valideneinkommen|>Valideneinkommen</);
  assert.match(html, /Invalideneinkommen/);
  assert.match(html, /Ergebnis und Dokumentation/);
  ["fv-source-type","fi-source-type","ekv-method","ekv-validation-list","workspace-select","workspace-old-select"].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test("Phase 4 Benutzerführung ist additiv und enthält keine Fachberechnung", () => {
  const source = read(path.join(ROOT, "src", "frontend", "app", "shell", "guidance.js"));
  assert.match(source, /function\s+updatePhase4Guidance\b/);
  assert.match(source, /function\s+initPhase4Shell\b/);
  assert.doesNotMatch(source, /calculateEkvCase\s*\(/);
  assert.doesNotMatch(source, /calculateInvalidStatisticalIncome\s*\(/);
  assert.doesNotMatch(source, /localStorage\b/);
});

test("Professionelle UI Komponenten bleiben vor den Workspace Feature Styles erhalten", () => {
  const manifest = JSON.parse(read(path.join(ROOT, "src", "build-manifest.json")));
  assert.ok(manifest.style_order.includes("50-professional-components.css"));
  assert.ok(manifest.style_order.indexOf("50-professional-components.css") < manifest.style_order.indexOf("60-workspaces.css"));
  const css = read(path.join(ROOT, "src", "frontend", "styles", "50-professional-components.css"));
  assert.match(css, /\.phase4-workflow/);
  assert.match(css, /\.phase4-result-overview/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /@media print/);
});

test("Build verwendet gepflegte src index.html als portable Hülle", () => {
  const build = read(path.join(ROOT, "scripts", "build.py"));
  assert.match(build, /frontend_root\/'index\.html'/);
});
