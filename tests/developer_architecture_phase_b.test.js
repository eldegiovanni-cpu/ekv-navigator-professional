"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const DOMAIN = require("../generated/cjs/domain.cjs");
const manifest = JSON.parse(read("src/build-manifest.json"));

const RETIRED_DUPLICATES = [
  "src/config/rules.js",
  "src/core/calculations.js",
  "src/core/income-calculations.js",
  "src/core/ekv-case.js",
  "src/core/statistical-base.js",
  "src/core/period-model.js",
  "src/backend/data/harmonization.js",
  "src/backend/data/repository.js",
  "src/validation/ekv-validation.js",
  "src/storage/migrations.js",
  "src/storage/workspace-model.js",
  "src/frontend/features/income/ui/income-flow.js"
];

test("Phase B besitzt keine zweite aktive Kopie des migrierten Fachkerns oder des Income Monolithen", () => {
  RETIRED_DUPLICATES.forEach(rel => assert.equal(fs.existsSync(path.join(ROOT, rel)), false, rel));
});

test("Application State ersetzt die historisch verteilten Laufzeitvariablen", () => {
  const runtimeFiles = manifest.module_order.map(rel => `src/${rel}`);
  const combined = runtimeFiles.map(read).join("\n");
  ["EKV_STATE","FLOW_DETAILS","SAVED_PERIODS","UI_DIRTY","LAST_SAVE_TEXT","LOADED_WORKSPACE_NAME"].forEach(name => assert.doesNotMatch(combined, new RegExp(`\\b${name}\\b`)));
  assert.match(combined, /APP_STATE\./);
});

test("Application State liegt im Frontend und besitzt Aktionen sowie stabilen Snapshot", () => {
  const source = read("src/frontend/state/application-state.js") + "\nthis.__createApplicationState = createApplicationState;";
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const state = sandbox.__createApplicationState();
  const events = [];
  const unsubscribe = state.subscribe((_, event) => events.push(event.type));
  state.setDirty(true);
  state.setSavedPeriods([{ id: "p1" }]);
  state.setIncomeSource("valid", "TA01");
  state.setFlowDetail("invalid", "Detail");
  state.setLoadedWorkspaceName("Fall A");
  const snapshot = state.snapshot();
  assert.equal(snapshot.dirty, true);
  assert.equal(snapshot.savedPeriods.length, 1);
  assert.equal(snapshot.ekvSources.validSource, "TA01");
  assert.equal(snapshot.flowDetails.invalid, "Detail");
  assert.equal(snapshot.loadedWorkspaceName, "Fall A");
  assert.deepEqual(Array.from(events), ["dirty", "savedPeriods", "incomeSource", "flowDetail", "loadedWorkspaceName"]);
  unsubscribe();
});

test("Browser Backend Bundle veröffentlicht nur die explizite Backend API", () => {
  const sandbox = { globalThis: null, __EKV_DATA__: JSON.parse(read("src/backend/data/base-data.json")), __EKV_BRANCH_ALIASES__: JSON.parse(read("src/backend/data/branch-aliases.json")) };
  sandbox.__EKV_DATA__.modes.TA11 = JSON.parse(read("src/backend/data/ta11-data.json"));
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("dist/assets/backend.bundle.js"), sandbox);
  assert.equal(typeof sandbox.EKV_BACKEND_API, "object");
  assert.equal(typeof sandbox.EKV_BACKEND_API.calculateEkvCase, "function");
  assert.equal(typeof sandbox.EKV_BACKEND_API.calculateStatisticalBase, "function");
  assert.equal(typeof sandbox.EKV_BACKEND_API.validateEkvCase, "function");
  assert.equal(typeof sandbox.calculateEkvCase, "undefined");
  assert.equal(typeof sandbox.harmonizeDataBasis, "undefined");
  assert.equal(typeof sandbox.EKV_RULES, "undefined");
});

test("Developer Source und generierter CommonJS Testkern liefern identischen Referenzfall", () => {
  const result = DOMAIN.calculateEkvCase({ validIncome: 80000, invalidIncome: 40000 });
  assert.equal(result.grade, 0.5);
  assert.equal(result.finalGrade, 0.5);
});

test("Frontend Bundle enthält keine Definition des Fachkerns und nutzt den Backend Client", () => {
  const appBundle = read("dist/assets/frontend.bundle.js");
  assert.doesNotMatch(appBundle, /function calculateEkvCase\s*\(/);
  assert.doesNotMatch(appBundle, /function calculateInvalidStatisticalIncome\s*\(/);
  assert.match(appBundle, /const APP_STATE = createApplicationState\(\)/);
  assert.match(appBundle, /window\.EKV_BACKEND_API/);
});
