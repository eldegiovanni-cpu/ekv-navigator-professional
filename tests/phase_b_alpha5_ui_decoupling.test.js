"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const manifest = JSON.parse(read("src/build-manifest.json"));

const comparison = {
  form: "src/frontend/features/income-comparison/income-comparison-form-adapter.js",
  view: "src/frontend/features/income-comparison/income-comparison-view.js",
  controller: "src/frontend/features/income-comparison/income-comparison-controller.js"
};

test("Alpha 5 trennt Einkommensvergleich in Formularadapter, View und Controller", () => {
  Object.values(comparison).forEach(rel => assert.equal(exists(rel), true, rel));
  const controller = read(comparison.controller);
  assert.ok(controller.split(/\r?\n/).length < 35);
  assert.doesNotMatch(controller, /document\.|getElementById|innerHTML|textContent|classList/);
  assert.match(controller, /readIncomeComparisonForm\(/);
  assert.match(controller, /renderIncomeComparison\(/);
});

test("Formularadapter liest DOM, aber berechnet und rendert nicht", () => {
  const form = read(comparison.form);
  assert.match(form, /function readIncomeComparisonForm\(/);
  assert.match(form, /function toEkvCaseInput\(/);
  assert.match(form, /function toEkvValidationInput\(/);
  assert.doesNotMatch(form, /calculateEkvCase\(|validateEkvCase\(/);
  assert.doesNotMatch(form, /innerHTML\s*=|textContent\s*=/);
});

test("Income Comparison View enthält keine Fachberechnung", () => {
  const view = read(comparison.view);
  assert.match(view, /function renderIncomeComparison\(/);
  assert.doesNotMatch(view, /calculateEkvCase\(|validateEkvCase\(/);
  assert.match(view, /renderIncomeComparisonMetrics\(/);
  assert.match(view, /renderIncomeComparisonValidation\(/);
  assert.match(view, /renderIncomeComparisonStatus\(/);
});

test("Gemeinsame Präsentationsformatierung ist zentral und DOM unabhängig", () => {
  const formatting = read("src/frontend/shared/formatting/presentation-format.js");
  const periodView = read("src/frontend/features/periods/period-view.js");
  assert.match(formatting, /function escapeHtml\(/);
  assert.match(formatting, /function formatDateDisplay\(/);
  assert.match(formatting, /function formatPeriodDisplay\(/);
  assert.doesNotMatch(formatting, /document\.|window\.|localStorage/);
  assert.doesNotMatch(periodView, /function escapeHtml\(/);
  assert.doesNotMatch(periodView, /function formatDateDisplay\(/);
  assert.doesNotMatch(periodView, /function formatPeriodDisplay\(/);
  assert.match(read("src/frontend/shared/dom/dom-utils.js"), /function stripHtml\(/);
});

test("Frontend Build behandelt Manifest als Inventar und Bootstrap als expliziten Startpunkt", () => {
  assert.equal(manifest.frontend_entry, "frontend/app/bootstrap.js");
  assert.equal(manifest.backend_entry, "backend/backend-entry.mjs");
  const build = read("scripts/build.py");
  assert.match(build, /runtime_modules = sorted\(/);
  assert.match(build, /runtime_modules \+ \[bootstrap_rel\]/);

  const bundle = read("dist/assets/frontend.bundle.js");
  const bootstrapAt = bundle.indexOf("/* ===== FRONTEND frontend/app/bootstrap.js ===== */");
  const controllerAt = bundle.indexOf("/* ===== FRONTEND frontend/app/controller.js ===== */");
  const backendClientAt = bundle.indexOf("/* ===== FRONTEND frontend/backend/backend-client.js ===== */");
  assert.ok(controllerAt >= 0 && backendClientAt >= 0 && bootstrapAt >= 0);
  assert.ok(bootstrapAt > controllerAt && bootstrapAt > backendClientAt, "Bootstrap wird nach allen Runtime Modulen ausgeführt");
});

test("Zentrale HTML Escaping Definition ist im UI Runtime Bestand eindeutig", () => {
  const sources = manifest.module_order
    .map(rel => `src/${rel}`)
    .filter(rel => exists(rel))
    .map(read)
    .join("\n");
  const definitions = sources.match(/function escapeHtml\s*\(/g) || [];
  assert.equal(definitions.length, 1);
});
