"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const os = require("node:os");
const { execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const DOMAIN = require("../generated/cjs/domain.cjs");
const base = readJson("src/backend/data/base-data.json");
base.modes.TA11 = readJson("src/backend/data/ta11-data.json");
const aliases = readJson("src/backend/data/branch-aliases.json");

function pkg(dataset, rows) {
  return DOMAIN.createBfsRawPackage({ dataset, source: { title: "Testlieferung", sourceFile: "bfs-test.xlsx" }, rows });
}

test("Phase C besitzt getrennte RAW, NORMALIZED, CANONICAL, SCHEMA und AUDIT Ebenen", () => {
  ["raw","normalized","canonical","schemas","audit","pipeline"].forEach(dir => assert.equal(fs.existsSync(path.join(ROOT,"src/backend/data/bfs",dir)), true, dir));
});

test("BUA Lieferung akzeptiert abweichende BFS Benennung anhand NOGA und erzeugt kanonischen Patch", () => {
  const result = DOMAIN.importBfsRawPackage({ pkg: pkg("BUA", [
    { branch: "49 Landverkehr und komplett neue BFS Schreibweise", year: 2028, hours: "41,3" }
  ]), currentData: base, aliases });
  assert.equal(result.status, "ready");
  assert.equal(result.audit.mappingCounts["noga-code"], 1);
  assert.equal(result.canonicalPatch.workHoursBranch["49 Landverkehr und Transport in Rohrfernleitungen"]["2028"], 41.3);
  assert.equal(result.merge.data.workHoursBranch["49 Landverkehr und Transport in Rohrfernleitungen"]["2028"], 41.3);
});

test("Nominallohnindex normalisiert Geschlecht und Aliasbezeichnung", () => {
  const result = DOMAIN.importBfsRawPackage({ pkg: pkg("NLI", [
    { gender: "Männer", branch: "52 Landverkehr; Schifffahrt; Luftfahrt; Lagerei", year: "2028", index: "104,7" }
  ]), currentData: base, aliases });
  assert.equal(result.status, "ready");
  assert.equal(result.acceptedRows[0].gender, "Mann");
  assert.equal(result.acceptedRows[0].mappingMethod, "alias");
  assert.equal(result.canonicalPatch.indexData.Mann["52 Lagerei sowie Erbring. v. sonst. Dienstl. für den Verk."]["2028"], 104.7);
});

test("Unbekannte BFS Kategorie wird nicht geraten und blockiert Release Gate", () => {
  const result = DOMAIN.importBfsRawPackage({ pkg: pkg("BUA", [
    { branch: "Fantasiestatistik ohne NOGA", year: 2026, hours: 41.5 }
  ]), currentData: base, aliases });
  assert.equal(result.status, "review");
  assert.equal(result.audit.unresolvedCount, 1);
  const gate = DOMAIN.evaluateBfsReleaseGate([result]);
  assert.equal(gate.status, "blocked");
  assert.match(gate.blockers.join(" "), /ungeklärte Zuordnungen/);
});

test("Abweichender Wert fuer bestehende Zelle wird nicht still ueberschrieben", () => {
  const branch = "05-96 Total";
  const existing = base.workHoursBranch[branch]["2025"];
  const result = DOMAIN.importBfsRawPackage({ pkg: pkg("BUA", [
    { branch, year: 2025, hours: Number(existing) + 1 }
  ]), currentData: base, aliases });
  assert.equal(result.status, "review");
  assert.equal(result.audit.existingValueConflictCount, 1);
  assert.equal(result.merge.data.workHoursBranch[branch]["2025"], existing);
});

test("Identischer bestehender Wert gilt als kontrollierte Wiederholung und nicht als Konflikt", () => {
  const branch = "05-96 Total";
  const existing = base.workHoursBranch[branch]["2025"];
  const result = DOMAIN.importBfsRawPackage({ pkg: pkg("BUA", [
    { branch, year: 2025, hours: existing }
  ]), currentData: base, aliases });
  assert.equal(result.status, "ready");
  assert.equal(result.audit.unchangedExistingCount, 1);
  assert.equal(result.audit.newValueCount, 0);
});

test("Kollision innerhalb derselben BFS Lieferung wird erkannt", () => {
  const result = DOMAIN.importBfsRawPackage({ pkg: pkg("BUA", [
    { branch: "49 Erste Schreibweise", year: 2028, hours: 41.1 },
    { branch: "49 Zweite Schreibweise", year: 2028, hours: 41.2 }
  ]), currentData: base, aliases });
  assert.equal(result.status, "review");
  assert.equal(result.audit.collisionCount, 1);
});

test("TA11 und T17 verwenden ihre eigenen Kategorien statt NOGA Branchen", () => {
  const ta11 = DOMAIN.importBfsRawPackage({ pkg: pkg("LSE_TA11", [
    { year: 2026, education: "Universitäre Hochschule (UNI, ETH)", skill: "1+2", gender: "Frau", value: 14000 }
  ]), currentData: base, aliases });
  assert.equal(ta11.status, "ready");
  assert.equal(ta11.canonicalPatch.modes.TA11.lseData["2026"]["Universitäre Hochschule (UNI, ETH)"]["1+2"].Frau, 14000);
  const t17 = DOMAIN.importBfsRawPackage({ pkg: pkg("LSE_T17", [
    { year: 2026, branch: "1 Führungskräfte", gender: "Mann", value: 11000 }
  ]), currentData: base, aliases });
  assert.equal(t17.status, "ready");
  assert.equal(t17.canonicalPatch.modes.T17.lseData["2026"]["1 Führungskräfte"].Alle.Mann, 11000);
});

test("Release Gate gibt nur vollständig konfliktfreie Lieferungen frei", () => {
  const bua = DOMAIN.importBfsRawPackage({ pkg: pkg("BUA", [{ branch: "49 Andere Schreibweise", year: 2028, hours: 41.2 }]), currentData: base, aliases });
  const nli = DOMAIN.importBfsRawPackage({ pkg: pkg("NLI", [{ gender: "Frauen", branch: "49 Abweichender Name", year: 2028, index: 103.2 }]), currentData: base, aliases });
  const gate = DOMAIN.evaluateBfsReleaseGate([bua, nli]);
  assert.equal(gate.status, "ready");
  assert.deepEqual(gate.blockers, []);
});


test("BFS Pipeline CLI erzeugt Dry Run Artefakte ohne die produktive Datenbasis zu verändern", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ekv-bfs-pipeline-"));
  const baseFile = path.join(ROOT, "src", "backend", "data", "base-data.json");
  const before = fs.readFileSync(baseFile, "utf8");
  const stdout = execFileSync(process.execPath, [path.join(ROOT,"scripts","bfs_pipeline.js"), "--input", path.join(ROOT,"tests","fixtures","bfs","bua-2028-example.json"), "--out-dir", tmp], { cwd: ROOT, encoding: "utf8" });
  const summary = JSON.parse(stdout);
  assert.equal(summary.status, "ready");
  assert.equal(fs.existsSync(summary.files.normalized), true);
  assert.equal(fs.existsSync(summary.files.patch), true);
  assert.equal(fs.existsSync(summary.files.audit), true);
  assert.equal(fs.existsSync(summary.files.candidate), true);
  assert.equal(fs.readFileSync(baseFile, "utf8"), before);
});
