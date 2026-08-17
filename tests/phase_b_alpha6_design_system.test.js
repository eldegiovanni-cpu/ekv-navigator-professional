"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const manifest = JSON.parse(read("src/build-manifest.json"));

const expectedStyles = [
  "00-design-tokens.css",
  "10-foundation.css",
  "15-shell-foundation.css",
  "20-application-shell.css",
  "30-ekv-layout.css",
  "40-workspace-indicator.css",
  "50-professional-components.css",
  "60-workspaces.css",
  "70-data-inspector.css",
  "80-commercial-product.css"
];

function cssMetrics() {
  const selectors = [];
  let lines = 0;
  for (const name of expectedStyles) {
    const source = read(`src/frontend/styles/${name}`);
    lines += source.split(/\r?\n/).length;
    const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of clean.matchAll(/([^{}]+)\{/g)) {
      const raw = match[1].replace(/\s+/g, " ").trim();
      if (!raw || raw.startsWith("@") || /^(from|to|\d+%)/.test(raw)) continue;
      for (const selector of raw.split(",")) {
        const normalized = selector.replace(/\s+/g, " ").trim();
        if (normalized) selectors.push(normalized);
      }
    }
  }
  const counts = new Map();
  for (const selector of selectors) counts.set(selector, (counts.get(selector) || 0) + 1);
  return {
    lines,
    selectorOccurrences: selectors.length,
    duplicateSelectors: [...counts.values()].filter(value => value > 1).length
  };
}

test("Alpha 6 verwendet semantische Styles statt historischer Theme Generationen", () => {
  assert.deepEqual(manifest.style_order, expectedStyles);
  for (const name of expectedStyles) assert.equal(exists(`src/frontend/styles/${name}`), true, name);
  assert.equal(exists("src/frontend/styles/20-theme-sva-red.css"), false);
  assert.equal(exists("src/frontend/styles/30-theme-sva-blue.css"), false);
  assert.equal(exists("src/frontend/styles/40-theme-sva-squares.css"), false);
  assert.equal(exists("src/frontend/styles/70-phase4-professional.css"), false);
  assert.equal(exists("src/frontend/styles/80-phase5-workspaces.css"), false);
});

test("Design Tokens besitzen eine einzige aktive Root Definition", () => {
  const tokenSource = read("src/frontend/styles/00-design-tokens.css");
  assert.match(tokenSource, /--color-primary:\s*#276c73/);
  assert.match(tokenSource, /--color-success:/);
  assert.match(tokenSource, /--radius-lg:/);
  assert.match(tokenSource, /--shadow-card:/);
  assert.match(tokenSource, /--p4-blue-800:\s*var\(--color-primary\)/);
  const all = expectedStyles.map(name => read(`src/frontend/styles/${name}`));
  const rootDefinitions = all.join("\n").match(/:root\s*\{/g) || [];
  assert.equal(rootDefinitions.length, 1);
});

test("Shell Layout Grundlagen sind von Farbthemes entkoppelt", () => {
  const source = read("src/frontend/styles/15-shell-foundation.css");
  assert.match(source, /\.ekvp-brand-row\s*\{[\s\S]*display:\s*flex/);
  assert.match(source, /\.ekvp-logo-lockup\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(source, /\.ekvp-header-actions\s*\{[\s\S]*display:\s*flex/);
  assert.match(source, /\.section-title\s*\{\s*font-weight:\s*900/);
  assert.doesNotMatch(source, /background:\s*(?:linear-gradient|radial-gradient)/);
});

test("EKV Layout enthält keine historische Mehrfachkorrektur mehr", () => {
  const source = read("src/frontend/styles/30-ekv-layout.css");
  assert.ok(source.split(/\r?\n/).length < 110);
  assert.doesNotMatch(source, /Layoutoptimierung|Qualitätskorrektur|DOM- und Layoutkorrektur|Designfix/);
  const desktopGridColumns = source.match(/grid-template-columns:\s*minmax\(0, 1\.6fr\)\s+minmax\(360px, 0\.9fr\)/g) || [];
  assert.equal(desktopGridColumns.length, 1, "Desktop Grid besitzt eine eindeutige Hauptdefinition");
});

test("CSS Komplexität ist gegenüber Phase A messbar reduziert", () => {
  const metrics = cssMetrics();
  assert.ok(metrics.lines <= 2200, metrics);
  assert.ok(metrics.duplicateSelectors <= 140, metrics);
  assert.ok(metrics.selectorOccurrences <= 640, metrics);
});

test("Build CSS dokumentiert nur aktive semantische Style Module", () => {
  const bundle = read("dist/assets/app.css");
  for (const name of expectedStyles) assert.match(bundle, new RegExp(`styles/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.doesNotMatch(bundle, /theme-sva-red|theme-sva-blue|phase4-professional|phase5-workspaces/);
});
