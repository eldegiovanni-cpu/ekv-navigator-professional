"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const base = JSON.parse(fs.readFileSync(path.join(ROOT,"src","backend","data","base-data.json"),"utf8"));
base.modes.TA11 = JSON.parse(fs.readFileSync(path.join(ROOT,"src","backend","data","ta11-data.json"),"utf8"));
const aliases = JSON.parse(fs.readFileSync(path.join(ROOT,"src","backend","data","branch-aliases.json"),"utf8"));
const {
  normalizeBfsLabel,
  extractNogaCode,
  resolveCanonicalBranch,
  harmonizeBranchMap,
  harmonizeDataBasis,
  getIncomeIndex,
  getWorkHoursStat,
  getBaseSalary
} = require("../../generated/cjs/domain.cjs");

test("BFS Bezeichnungen werden robust normalisiert", () => {
  assert.equal(normalizeBfsLabel("05–43  SEKTOR 2 PRODUKTION"), normalizeBfsLabel("05-43 SEKTOR 2 PRODUKTION"));
  assert.equal(extractNogaCode("77, 79–82 Sonstige Dienstleistungen"), "77,79-82");
});

test("eindeutiger NOGA Code löst abweichende Rohbezeichnung ohne manuelles Umbenennen auf", () => {
  const result = resolveCanonicalBranch(base, "49 Landverkehr und ganz andere BFS Schreibweise", aliases);
  assert.equal(result.status, "matched");
  assert.equal(result.method, "noga-code");
  assert.equal(result.canonical, "49 Landverkehr und Transport in Rohrfernleitungen");
});

test("explizite Aliasregel löst bekannte BFS Variante auf", () => {
  const result = resolveCanonicalBranch(base, "52 Landverkehr; Schifffahrt; Luftfahrt; Lagerei", aliases);
  assert.equal(result.status, "matched");
  assert.equal(result.method, "alias");
  assert.equal(result.canonical, "52 Lagerei sowie Erbring. v. sonst. Dienstl. für den Verk.");
});

test("nicht eindeutige oder unbekannte Kategorie wird nicht geraten", () => {
  const result = resolveCanonicalBranch(base, "Unbekannte Kategorie ohne NOGA Code", aliases);
  assert.equal(result.status, "unresolved");
  assert.equal(result.canonical, null);
});

test("Rohlisten können über kanonische Branchen zusammengeführt werden", () => {
  const raw = {
    "49 Andere BFS Schreibweise": { "2025": 41.2 },
    "05–96 Total": { "2025": 41.7 }
  };
  const result = harmonizeBranchMap(raw, base, aliases);
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.data["49 Landverkehr und Transport in Rohrfernleitungen"]["2025"], 41.2);
  assert.equal(result.data["05-96 Total"]["2025"], 41.7);
});

test("aktuelle Datenbasis harmonisiert ohne offene Zuordnungen und bleibt rechnerisch erreichbar", () => {
  const data = structuredClone(base);
  const report = harmonizeDataBasis(data, aliases);
  assert.deepEqual(report.unresolved, []);
  assert.deepEqual(report.collisions, []);
  assert.equal(getIncomeIndex(data, "49 Landverkehr und andere Schreibweise", "Mann", 2024), getIncomeIndex(data, "49 Landverkehr und Transport in Rohrfernleitungen", "Mann", 2024));
  assert.equal(getWorkHoursStat(data, "TA01", "49 Landverkehr und andere Schreibweise", 2025), getWorkHoursStat(data, "TA01", "49 Landverkehr und Transport in Rohrfernleitungen", 2025));
  assert.equal(getBaseSalary(data, "TA01", "Mann", "49 Landverkehr und andere Schreibweise", "1", 2024), getBaseSalary(data, "TA01", "Mann", "49 Landverkehr und Transport in Rohrfernleitungen", "1", 2024));
});
