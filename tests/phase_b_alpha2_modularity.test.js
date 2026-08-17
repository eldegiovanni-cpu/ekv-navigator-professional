"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const manifest = JSON.parse(read("src/build-manifest.json"));

const incomeModules = {
  statistical: "src/frontend/features/income/statistical/statistical-income.js",
  ahv: "src/frontend/features/income/ahv/ahv-income.js",
  wage: "src/frontend/features/income/wage/wage-calculator.js",
  direct: "src/frontend/features/income/direct/direct-income.js",
  orchestrator: "src/frontend/features/income/income-orchestrator.js"
};

test("Income Feature ist in fachliche Teilmodule zerlegt", () => {
  Object.values(incomeModules).forEach(rel => assert.equal(fs.existsSync(path.join(ROOT, rel)), true, rel));
  assert.equal(fs.existsSync(path.join(ROOT, "src/frontend/features/income/ui/income-flow.js")), false);
  assert.match(read(incomeModules.statistical), /function calcFlowStat\(/);
  assert.doesNotMatch(read(incomeModules.statistical), /function calcFlowIncome\(/);
  assert.match(read(incomeModules.ahv), /function calcFlowIncome\(/);
  assert.match(read(incomeModules.wage), /function calcFlowWage\(/);
  assert.match(read(incomeModules.direct), /function calcFlowDirect\(/);
});

test("Income Orchestrator enthält keine Fachberechnungsimplementierung", () => {
  const text = read(incomeModules.orchestrator);
  assert.ok(text.split(/\r?\n/).length < 60);
  ["calculateStatisticalBase", "calculateIncomeRow", "calculateWageResults", "calculateDirectIncome"].forEach(name => assert.doesNotMatch(text, new RegExp(`\\b${name}\\b`)));
  assert.match(text, /initStatisticalIncome\(side\)/);
  assert.match(text, /initAhvIncome\(side\)/);
  assert.match(text, /initWageCalculator\(side\)/);
  assert.match(text, /initDirectIncome\(side\)/);
});

test("Application Controller ist auf Orchestrierung reduziert", () => {
  const controller = read("src/frontend/app/controller.js");
  assert.ok(controller.split(/\r?\n/).length <= 120);
  assert.doesNotMatch(controller, /function calcEkv\(/);
  assert.doesNotMatch(controller, /function activateTab\(/);
  assert.match(read("src/frontend/features/income-comparison/income-comparison-controller.js"), /function calcEkv\(/);
  assert.match(read("src/frontend/app/shell/navigation.js"), /function activateTab\(/);
});

test("State Mutationen im Runtime Code erfolgen über Aktionen", () => {
  const runtime = manifest.module_order.map(rel => read(`src/${rel}`)).join("\n");
  assert.doesNotMatch(runtime, /APP_STATE\.ekvSources\.(?:validSource|invalidSource)\s*=/);
  assert.doesNotMatch(runtime, /APP_STATE\.flowDetails\.(?:valid|invalid)\s*=/);
  assert.doesNotMatch(runtime, /APP_STATE\.savedPeriods\.(?:push|splice)\s*\(/);
  assert.doesNotMatch(runtime, /APP_STATE\.(?:dirty|lastSaveText|loadedWorkspaceName|savedPeriods)\s*=(?!=)/);
  ["setIncomeSource", "setFlowDetail", "setSavedPeriods", "upsertSavedPeriod", "setDirty", "setLoadedWorkspaceName"].forEach(name => assert.match(read("src/frontend/state/application-state.js"), new RegExp(`\\b${name}\\b`)));
});

test("Build Manifest inventarisiert alle neuen Income Module genau einmal", () => {
  const order = manifest.module_order;
  const expected = [
    "frontend/features/income/shared/income-flow-shared.js",
    "frontend/features/income/statistical/statistical-income.js",
    "frontend/features/income/ahv/ahv-income.js",
    "frontend/features/income/wage/wage-calculator.js",
    "frontend/features/income/direct/direct-income.js",
    "frontend/features/income/income-orchestrator.js",
    "frontend/features/income/valid/valid-income-controller.js",
    "frontend/features/income/invalid/invalid-income-controller.js",
    "frontend/features/income/income-entry.js"
  ];
  expected.forEach(rel => assert.equal(order.filter(item => item === rel).length, 1, rel));
});
