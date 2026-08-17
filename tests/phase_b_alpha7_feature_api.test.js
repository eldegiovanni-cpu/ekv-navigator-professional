"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = rel => fs.existsSync(path.join(ROOT, rel));

const apiFiles = {
  workspace: "src/frontend/features/workspaces/workspace-controller.js",
  periods: "src/frontend/features/periods/period-controller.js",
  comparison: "src/frontend/features/income-comparison/income-comparison-controller.js",
  income: "src/frontend/features/income/income-entry.js",
  export: "src/frontend/features/export/export-controller.js",
  inspector: "src/frontend/features/data-inspector/data-inspector.js",
  guidance: "src/frontend/app/shell/guidance.js",
  navigation: "src/frontend/app/shell/navigation.js"
};

test("Alpha 7 besitzt eine gemeinsame UI Komponentenebene", () => {
  const rel = "src/frontend/shared/ui/components.js";
  assert.equal(exists(rel), true);
  const source = read(rel);
  assert.match(source, /function setStatusIndicator\(/);
  assert.match(source, /function statusIndicatorMarkup\(/);
  assert.match(source, /function emptyStateMarkup\(/);
  assert.match(source, /function labeledValueMarkup\(/);
  assert.doesNotMatch(source, /calculateEkvCase|localStorage|APP_STATE/);
});

test("Status und Leerzustände verwenden gemeinsame Komponenten", () => {
  assert.match(read("src/frontend/features/workspaces/workspace-status.js"), /setStatusIndicator\(/);
  assert.match(read("src/frontend/features/workspaces/workspace-view.js"), /statusIndicatorMarkup\(/);
  assert.match(read("src/frontend/features/workspaces/workspace-view.js"), /emptyStateMarkup\(/);
  assert.match(read("src/frontend/features/periods/period-view.js"), /statusIndicatorMarkup\(/);
  assert.match(read("src/frontend/features/periods/period-view.js"), /labeledValueMarkup\(/);
  assert.match(read("src/frontend/features/data-inspector/data-inspector.js"), /setStatusIndicator\(/);
  assert.match(read("src/frontend/app/shell/guidance.js"), /setStatusIndicator\(/);
});

test("Öffentliche Feature Grenzen sind als explizite APIs definiert", () => {
  const expectations = [
    [apiFiles.workspace, "WORKSPACE_FEATURE_API"],
    [apiFiles.periods, "PERIOD_FEATURE_API"],
    [apiFiles.comparison, "INCOME_COMPARISON_FEATURE_API"],
    [apiFiles.income, "INCOME_FEATURE_API"],
    [apiFiles.export, "EXPORT_FEATURE_API"],
    [apiFiles.inspector, "DATA_INSPECTOR_FEATURE_API"],
    [apiFiles.guidance, "GUIDANCE_FEATURE_API"],
    [apiFiles.navigation, "NAVIGATION_FEATURE_API"]
  ];
  for (const [rel, name] of expectations) {
    const source = read(rel);
    assert.match(source, new RegExp(`const ${name} = Object\\.freeze\\(`), `${name} fehlt in ${rel}`);
  }
});

test("Application Controller verwendet Feature APIs statt konkrete Feature Funktionen", () => {
  const source = read("src/frontend/app/controller.js");
  for (const api of [
    "WORKSPACE_FEATURE_API",
    "PERIOD_FEATURE_API",
    "INCOME_COMPARISON_FEATURE_API",
    "EXPORT_FEATURE_API",
    "NAVIGATION_FEATURE_API",
    "GUIDANCE_FEATURE_API",
    "DATA_INSPECTOR_FEATURE_API"
  ]) assert.match(source, new RegExp(api));

  assert.doesNotMatch(source, /\b(saveWorkspace|loadWorkspace|deleteWorkspace|saveCurrentPeriod|renderSavedPeriods|exportPdfView|copyWordContent|initDataInspector|initPhase4Shell|calcEkv|activateTab)\s*\(/);
});

test("Workspace Listener werden erst über Feature init registriert", () => {
  const source = read(apiFiles.workspace);
  assert.match(source, /function initWorkspaceFeature\(/);
  const initAt = source.indexOf("function initWorkspaceFeature(");
  const searchAt = source.indexOf('document.getElementById("workspace-search")');
  assert.ok(searchAt > initAt, "Workspace DOM Listener sollen innerhalb des init Einstiegspunkts liegen");
  assert.match(source, /init:\s*initWorkspaceFeature/);
});

test("Data Inspector kapselt seinen UI Zustand in einem State Objekt", () => {
  const source = read(apiFiles.inspector);
  assert.match(source, /const DATA_INSPECTOR_STATE = \{/);
  assert.doesNotMatch(source, /let DATA_INSPECTOR_(PAGE|ROWS|FILTERED)/);
  assert.match(source, /DATA_INSPECTOR_STATE\.page/);
  assert.match(source, /DATA_INSPECTOR_STATE\.filtered/);
});

test("Bootstrap startet nur noch über explizite APIs", () => {
  const source = read("src/frontend/app/bootstrap.js");
  assert.match(source, /INCOME_FEATURE_API\.init\(\)/);
  assert.match(source, /APPLICATION_FEATURE_API\.init\(\)/);
  assert.doesNotMatch(source, /\binitEkvFlow\(\)|\binitApplication\(\)/);
});
