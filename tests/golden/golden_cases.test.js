"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "../..");
const DOMAIN = require(path.join(ROOT, "generated/cjs/domain.cjs"));
const suite = JSON.parse(fs.readFileSync(path.join(__dirname, "golden_cases_v1.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "governance/golden-cases.lock.json"), "utf8"));
const base = JSON.parse(fs.readFileSync(path.join(ROOT, "src/backend/data/base-data.json"), "utf8"));
base.modes.TA11 = JSON.parse(fs.readFileSync(path.join(ROOT, "src/backend/data/ta11-data.json"), "utf8"));
const legacyReferenceData = JSON.parse(fs.readFileSync(path.join(__dirname, "reference-data-2.1/base-data.json"), "utf8"));
legacyReferenceData.modes.TA11 = JSON.parse(fs.readFileSync(path.join(__dirname, "reference-data-2.1/ta11-data.json"), "utf8"));
const aliases = JSON.parse(fs.readFileSync(path.join(ROOT, "src/backend/data/branch-aliases.json"), "utf8"));

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function approx(actual, expected, label) {
  if (typeof expected === "number") {
    assert.equal(typeof actual, "number", `${label}: Zahl erwartet`);
    const tolerance = Math.max(1e-9, Math.abs(expected) * 1e-12);
    assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} statt ${expected}`);
    return;
  }
  if (Array.isArray(expected)) {
    assert.equal(Array.isArray(actual), true, `${label}: Array erwartet`);
    assert.equal(actual.length, expected.length, `${label}: Arraylaenge`);
    expected.forEach((value, index) => approx(actual[index], value, `${label}[${index}]`));
    return;
  }
  if (expected && typeof expected === "object") {
    assert.ok(actual && typeof actual === "object", `${label}: Objekt erwartet`);
    for (const [key, value] of Object.entries(expected)) approx(actual[key], value, `${label}.${key}`);
    return;
  }
  assert.equal(actual, expected, label);
}
function execute(c) {
  switch (c.operation) {
    case "calculateInvalidStatisticalIncome": return DOMAIN.calculateInvalidStatisticalIncome(c.input.base, c.input.options);
    case "calculateValidStatisticalIncome": return DOMAIN.calculateValidStatisticalIncome(c.input.base, c.input.parallelIncome);
    case "calculateEkvComparison": return DOMAIN.calculateEkvComparison(c.input.validIncome, c.input.invalidIncome);
    case "calculateMixedMethod": return DOMAIN.calculateMixedMethod(c.input);
    case "calculateDirectIncome": return DOMAIN.calculateDirectIncome(c.input);
    case "calculateIncomeRow": return DOMAIN.calculateIncomeRow(c.input);
    case "calculateWageResults": return DOMAIN.calculateWageResults(c.input);
    case "calculateStatisticalAnnual": return { value: DOMAIN.calculateStatisticalAnnual(c.input) };
    case "effectiveLseYear": return { value: DOMAIN.effectiveLseYear(c.input.year) };
    case "calculateStatisticalBase": return DOMAIN.calculateStatisticalBase(legacyReferenceData, c.input, aliases);
    default: throw new Error(`Unbekannte Golden Case Operation: ${c.operation}`);
  }
}

test("Golden Case Suite ist mit der freigegebenen 2.1 Referenz verankert und unveraendert", () => {
  assert.equal(suite.locked, true);
  assert.equal(suite.reference.appVersion, "2.1.0");
  assert.equal(suite.reference.referenceSha256, lock.referenceSha256);
  assert.equal(suite.caseCount, suite.cases.length);
  assert.equal(lock.caseCount, suite.cases.length);
  assert.equal(sha(path.join(ROOT, lock.file)), lock.sha256);
  assert.ok(suite.cases.length >= 50 && suite.cases.length <= 100);
});

for (const c of suite.cases) {
  test(`Golden Case ${c.id}`, () => {
    const actual = execute(c);
    approx(actual, c.expected, c.id);
  });
}
