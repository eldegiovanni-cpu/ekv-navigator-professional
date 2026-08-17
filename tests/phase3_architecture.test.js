"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const PURE_FILES = [
  "src/backend/domain/rules/ekv-rules.mjs",
  "src/backend/domain/calculations/calculations.mjs",
  "src/backend/domain/calculations/income-calculations.mjs",
  "src/backend/domain/calculations/ekv-case.mjs",
  "src/backend/domain/models/period-model.mjs",
  "src/backend/domain/models/workspace-migrations.mjs",
  "src/backend/domain/models/workspace-model.mjs",
  "src/backend/domain/validation/ekv-validation.mjs",
  "src/backend/data/bfs/mappings/harmonization.mjs",
  "src/backend/data/bfs/repository.mjs",
  "src/backend/data/bfs/statistical-base.mjs",
  "src/frontend/state/application-state.js"
];
const FORBIDDEN = [/\bdocument\b/, /\bwindow\b/, /\blocalStorage\b/, /\bconfirm\s*\(/, /\balert\s*\(/];

test("Developer Architecture Fachkern enthält keine Browser oder Persistenzabhängigkeiten", () => {
  const violations = [];
  for (const rel of PURE_FILES) {
    const source = read(rel);
    for (const pattern of FORBIDDEN) if (pattern.test(source)) violations.push(`${rel}: ${pattern}`);
  }
  assert.deepEqual(violations, []);
});

test("Fachmodule deklarieren Abhängigkeiten explizit über ES Imports", () => {
  assert.match(read("src/backend/domain/calculations/calculations.mjs"), /import \{ EKV_RULES \} from/);
  assert.match(read("src/backend/domain/calculations/ekv-case.mjs"), /import \{ calculateEkvComparison, calculateMixedMethod \} from/);
  assert.match(read("src/backend/data/bfs/repository.mjs"), /import \{ effectiveLseYear, indexGender, round \} from/);
  for (const rel of PURE_FILES) {
    const source = read(rel);
    assert.doesNotMatch(source, /module\.exports|\brequire\s*\(/, rel);
  }
});

test("ausgelieferte UI verwendet weiterhin zentralen EKV Fallkern", () => {
  const controller = read("src/frontend/features/income-comparison/income-comparison-controller.js");
  assert.match(controller, /calculateEkvCase\s*\(/);
  assert.match(controller, /validateEkvCase\s*\(/);
  assert.doesNotMatch(controller, /calculateMixedMethod\s*\(/);
  assert.doesNotMatch(read("src/frontend/app/controller.js"), /calculateEkvCase\s*\(/);
});

test("statistische UI verwendet Repository und reine statistische Basis", () => {
  const statistical = read("src/frontend/features/income/statistical/statistical-income.js");
  const ahv = read("src/frontend/features/income/ahv/ahv-income.js");
  const direct = read("src/frontend/features/income/direct/direct-income.js");
  assert.match(statistical, /calculateStatisticalBase\(DATA,/);
  assert.match(ahv, /getIncomeIndex\(DATA,/);
  assert.match(direct, /getIncomeIndex\(DATA,/);
  assert.doesNotMatch(statistical, /function\s+calculateStatisticalBase\b/);
});

test("Build Manifest trennt Domain Build von Legacy UI Build", () => {
  const manifest = JSON.parse(read("src/build-manifest.json"));
  assert.equal(manifest.phase, "developer-architecture-3.0-final");
  assert.equal(manifest.release_channel, "final");
  assert.equal(manifest.backend_entry, "backend/backend-entry.mjs");
  assert.equal(manifest.frontend_entry, "frontend/app/bootstrap.js");
  const forbiddenLegacy = ["config/rules.js","core/calculations.js","core/income-calculations.js","core/ekv-case.js","data/repository.js","data/harmonization.js","storage/migrations.js","storage/workspace-model.js"];
  forbiddenLegacy.forEach(rel => assert.equal(manifest.module_order.includes(rel), false, rel));
});
