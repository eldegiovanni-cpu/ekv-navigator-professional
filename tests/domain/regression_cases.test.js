"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const cases = require("../fixtures/regression_cases.json");
const { calculateInvalidStatisticalIncome, calculateValidStatisticalIncome, calculateEkvComparison, calculateMixedMethod } = require("../../generated/cjs/domain.cjs");

for (const c of cases) {
  test(`kanonischer Referenzfall ${c.id}`, () => {
    let actual;
    if (c.type === "invalidStat") actual = calculateInvalidStatisticalIncome({ annual: c.annual, year: c.year }, c).finalValue;
    else if (c.type === "validStat") actual = calculateValidStatisticalIncome({ annual: c.annual }, c.parallelIncome).finalValue;
    else if (c.type === "ekv") actual = calculateEkvComparison(c.valid, c.invalid).grade;
    else if (c.type === "mixed") actual = calculateMixedMethod(c).finalGrade;
    else throw new Error(`Unbekannter Testfalltyp: ${c.type}`);
    assert.ok(Math.abs(actual - c.expected) < 1e-9, `${c.id}: ${actual} statt ${c.expected}`);
  });
}
