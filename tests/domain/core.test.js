"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const BASE = require("../../src/backend/data/base-data.json");
const TA11 = require("../../src/backend/data/ta11-data.json");
const DATA = structuredClone(BASE);
DATA.modes.TA11 = structuredClone(TA11);

const {
  calculateInvalidStatisticalIncome,
  calculateStatisticalAnnual,
  calculateValidStatisticalIncome,
  effectiveLseYear,
  round,
  calculateDirectIncome,
  calculateEkvComparison,
  calculateIncomeAverage,
  calculateIncomeRow,
  calculateMixedMethod,
  calculateWageResults,
  selectWageResult,
  calculateEkvCase,
  calculateStatisticalBase,
  collectAvailableYears,
  getAvailableStatisticalYears,
  resolveLseSourceYear,
  getBaseSalary,
  getIncomeIndex,
  getModeConfig,
  getStatIndex,
  getWorkHoursStat,
  sourceYearLabel,
  validateDataBasis
} = require("../../generated/cjs/domain.cjs");

test("LSE Quelljahre entsprechen der Referenz", () => {
  assert.equal(effectiveLseYear(2018), 2018);
  assert.equal(effectiveLseYear(2019), 2018);
  assert.equal(effectiveLseYear(2020), 2020);
  assert.equal(effectiveLseYear(2023), 2022);
  assert.equal(effectiveLseYear(2026), 2024);
});

test("statistischer Jahreswert verwendet 40 Stunden Basis", () => {
  assert.equal(round(calculateStatisticalAnnual({ monthly: 6000, hours: 42, baseIndex: 100, targetIndex: 105 }), 2), 79380);
});

test("Valideneinkommen parallelisiert auf 95 Prozent", () => {
  const result = calculateValidStatisticalIncome({ annual: 100000 }, 90000);
  assert.equal(result.finalValue, 95000);
  assert.match(result.parallelText, /95/);
});

test("Valideneinkommen ohne Parallelisierung bleibt unverändert", () => {
  assert.equal(calculateValidStatisticalIncome({ annual: 100000 }, 98000).finalValue, 100000);
});

test("ab 2024 Pauschalabzug 10 Prozent ohne Teilzeitabzug", () => {
  const result = calculateInvalidStatisticalIncome({ annual: 100000, year: 2024 }, { besitzstand: "Nein", restAf: 0.8, leidens: 0 });
  assert.equal(result.finalValue, 72000);
  assert.equal(result.pauschalLabel, "Pauschalabzug 10 Prozent");
  assert.equal(result.teilzeitLabel, "Kein Teilzeitabzug");
});

test("ab 2024 Pauschalabzug und Teilzeitabzug werden separat additiv berücksichtigt", () => {
  const result = calculateInvalidStatisticalIncome({ annual: 100000, year: 2024 }, { besitzstand: "Nein", restAf: 0.5, leidens: 0 });
  assert.equal(result.finalValue, 40000);
  assert.equal(result.pauschalLabel, "Pauschalabzug 10 Prozent");
  assert.equal(result.teilzeitLabel, "Teilzeitabzug 10 Prozent");
});

test("bei Restarbeitsfähigkeit über 50 Prozent entfällt Teilzeitabzug", () => {
  const result = calculateInvalidStatisticalIncome({ annual: 100000, year: 2024 }, { besitzstand: "Nein", restAf: 0.51, leidens: 0 });
  assert.equal(result.finalValue, 45900);
  assert.equal(result.teilzeitLabel, "Kein Teilzeitabzug");
});

test("2023 Teilzeitabzug wird nach Leistungsanpassung angewendet", () => {
  assert.equal(calculateInvalidStatisticalIncome({ annual: 100000, year: 2023 }, { besitzstand: "Nein", restAf: 0.5, leidens: 0 }).finalValue, 45000);
});

test("Besitzstand verhindert neue Abzüge und lässt leidensbedingten Abzug zu", () => {
  const result = calculateInvalidStatisticalIncome({ annual: 100000, year: 2024 }, { besitzstand: "Ja", restAf: 0.5, leidens: 0.1 });
  assert.equal(result.finalValue, 45000);
  assert.equal(result.pauschalLabel, "Kein Pauschalabzug");
});

test("AHV Teilzeiteinkommen wird auf 100 Prozent hochgerechnet und indexiert", () => {
  const row = calculateIncomeRow({ amount: 50000, kind: "partial", pensum: 50, sourceIndex: 100, targetIndex: 110 });
  assert.equal(row.fullAmount, 100000);
  assert.equal(row.uprated, 110000);
  assert.equal(row.complete, true);
});

test("ungültiges Teilzeitpensum ergibt keinen vollständigen AHV Wert", () => {
  const row = calculateIncomeRow({ amount: 50000, kind: "partial", pensum: 0, sourceIndex: 100, targetIndex: 110 });
  assert.equal(row.validPensum, false);
  assert.equal(row.complete, false);
});

test("AHV Durchschnitt verwendet nur vollständige positive Werte", () => {
  const result = calculateIncomeAverage([{ uprated: 100000 }, { uprated: null }, { uprated: 120000 }]);
  assert.equal(result.average, 110000);
  assert.equal(result.count, 2);
});

test("Stundenlohnrechner hat vier Berechnungswege", () => {
  const result = calculateWageResults({ hourly: 30, weeklyHours: 40, seasonHourly: 35, annualHours: 1800, daily: 250, daysWeek: 5, weekly: 1500 });
  assert.deepEqual(result, { standard: 62400, season: 63000, day: 65000, week: 78000 });
  assert.equal(selectWageResult(result, "season").value, 63000);
});

test("manuell festgelegtes Teilzeiteinkommen wird hochgerechnet und indexiert", () => {
  const result = calculateDirectIncome({ income: 40000, kind: "partial", pensum: 50, indexEnabled: true, sourceIndex: 100, targetIndex: 110 });
  assert.equal(result.baseValue, 80000);
  assert.equal(result.finalValue, 88000);
  assert.equal(result.complete, true);
});

test("IVE über VE führt zu keiner Erwerbseinbusse und IV Grad 0", () => {
  const result = calculateEkvComparison(80000, 90000);
  assert.equal(result.loss, 0);
  assert.equal(result.grade, 0);
  assert.equal(result.noAcquisitionLoss, true);
});

test("gemischte Methode gewichtet Erwerb und Haushalt", () => {
  const result = calculateMixedMethod({ employmentGrade: 0.5, employmentShare: 0.6, householdShare: 0.4, householdLimitation: 0.25 });
  assert.equal(round(result.weightedEmployment, 2), 0.3);
  assert.equal(round(result.weightedHousehold, 2), 0.1);
  assert.equal(round(result.finalGrade, 2), 0.4);
});

test("zentraler EKV Fallkern liefert reinen und finalen Grad", () => {
  const result = calculateEkvCase({ validIncome: 60000, invalidIncome: 30000, method: "mixed", employmentShare: 0.8, householdShare: 0.2, householdLimitation: 0.25 });
  assert.equal(result.grade, 0.5);
  assert.equal(result.finalGrade, 0.45);
});

test("reale Datenbasis ist strukturell vollständig", () => {
  assert.deepEqual(validateDataBasis(DATA), { valid: true, issues: [] });
});

test("TA01 Referenzwert ist aus Repository abrufbar", () => {
  assert.equal(getBaseSalary(DATA, "TA01", "Mann", "05-96 Total", "1", 2024), 5421);
});

test("TA11 reale Referenzwerte sind abrufbar", () => {
  assert.equal(getBaseSalary(DATA, "TA11", "Frau", "Universitäre Hochschule (UNI, ETH)", "1+2", 2024), 13123);
  assert.equal(getWorkHoursStat(DATA, "TA11", "Totalwert", 2024), 41.7);
});

test("T17 und TA11 verwenden Totalindex", () => {
  assert.equal(getStatIndex(DATA, "TA11", "Universitäre Hochschule (UNI, ETH)", "Frau", 2024), getIncomeIndex(DATA, "05-96 Total", "Frau", 2024));
});

test("statistische TA01 Basis reproduziert Referenzwert", () => {
  const base = calculateStatisticalBase(DATA, { mode: "TA01", year: 2024, gender: "Mann", branch: "05-96 Total", skill: "1" });
  assert.equal(base.monthly, 5421);
  assert.equal(round(base.annual, 2), 67816.71);
});

test("statistische TA11 Basis reproduziert Referenzwert", () => {
  const base = calculateStatisticalBase(DATA, { mode: "TA11", year: 2024, gender: "Frau", branch: "Universitäre Hochschule (UNI, ETH)", skill: "1+2" });
  assert.equal(base.monthly, 13123);
  assert.equal(base.hours, 41.7);
  assert.equal(round(base.annual, 2), 164168.73);
});

test("verfügbare Jahre werden aus realer Datenbasis abgeleitet", () => {
  const years = collectAvailableYears(DATA);
  assert.ok(years.includes(2010));
  assert.ok(years.includes(2025));
  assert.ok(years.includes(2027));
});

test("Repository liefert Modus und Quellenjahrbezeichnung", () => {
  assert.equal(getModeConfig(DATA, "TA01").label, "LSE TA01");
  assert.match(sourceYearLabel(DATA, "TA01", 2025), /2024$/);
});


test("modusabhängige LSE Quelljahre nutzen die vollständige historische BFS Reihe", () => {
  assert.equal(resolveLseSourceYear(DATA, "TA01", 2012), 2012);
  assert.equal(resolveLseSourceYear(DATA, "TA01", 2017), 2016);
  assert.equal(resolveLseSourceYear(DATA, "T17", 2015), 2014);
  assert.equal(resolveLseSourceYear(DATA, "TA11", 2010), 2010);
  assert.equal(resolveLseSourceYear(DATA, "TA11", 2011), 2010);
  assert.equal(resolveLseSourceYear(DATA, "TA01", 2027), 2024);
});

test("statistische Jahresauswahl wird pro LSE Modus aus der Datenbasis abgeleitet", () => {
  const ta01 = getAvailableStatisticalYears(DATA, "TA01");
  const t17 = getAvailableStatisticalYears(DATA, "T17");
  const t11 = getAvailableStatisticalYears(DATA, "TA11");
  assert.equal(ta01[0], 2012);
  assert.equal(t17[0], 2012);
  assert.equal(t11[0], 2010);
  assert.ok(ta01.includes(2026));
  assert.ok(t11.includes(2027));
});

test("TA1 unsicherer Wert 72 Forschung KN1 wird nachvollziehbar auf 69-75 hochgestuft", () => {
  const neutral = calculateStatisticalBase(DATA, { mode: "TA01", year: 2024, gender: "Neutral", branch: "72 Forschung u. Entwicklung", skill: "1" });
  const frau = calculateStatisticalBase(DATA, { mode: "TA01", year: 2024, gender: "Frau", branch: "72 Forschung u. Entwicklung", skill: "1" });
  const mann = calculateStatisticalBase(DATA, { mode: "TA01", year: 2024, gender: "Mann", branch: "72 Forschung u. Entwicklung", skill: "1" });
  assert.equal(neutral.monthly, 5231);
  assert.equal(frau.monthly, 4918);
  assert.equal(mann.monthly, 5530);
  assert.equal(neutral.provenance.salary.rawValue, "[5984]");
  assert.equal(neutral.provenance.salary.usedGroup, "69-75");
  assert.match(neutral.qualityNotices.join(" "), /statistisch unsicher/);
});

test("T17 unsicherer Männerwert Gruppe 54 verwendet Berufshauptgruppe 5", () => {
  const result = calculateStatisticalBase(DATA, { mode: "T17", year: 2024, gender: "Mann", branch: "54 Schutzkräfte und Sicherheitsbedienstete", skill: "Alle" });
  assert.equal(result.monthly, 5439);
  assert.equal(result.provenance.salary.rawValue, "[6617]");
  assert.equal(result.provenance.salary.usedGroup, "5");
});

test("T11 markierter Ausbildungswert verwendet TOTAL derselben beruflichen Stellung", () => {
  const result = calculateStatisticalBase(DATA, { mode: "TA11", year: 2024, gender: "Frau", branch: "Unternehmensinterne Ausbildung", skill: "1+2" });
  assert.equal(result.monthly, 10077);
  assert.equal(result.provenance.salary.rawValue, "[5570]");
  assert.equal(result.provenance.salary.usedGroup, "Totalwert");
});

test("Zieljahre ohne publizierten NLE und BUA Wert weisen Fortschreibung 2025 aus", () => {
  const result = calculateStatisticalBase(DATA, { mode: "TA01", year: 2026, gender: "Neutral", branch: "05-96 Total", skill: "1" });
  assert.ok(result.qualityNotices.some(note => note.includes("Datenstand 2025") || note.includes("2025")));
  assert.equal(result.provenance.targetIndex.rawStatus, "CARRY_FORWARD");
  assert.equal(result.provenance.workHours.rawStatus, "CARRY_FORWARD");
});
