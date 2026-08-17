"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const DOMAIN = require("../generated/cjs/domain.cjs");
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const base = readJson("src/backend/data/base-data.json"); base.modes.TA11 = readJson("src/backend/data/ta11-data.json");
const aliases = readJson("src/backend/data/branch-aliases.json");
const FIX = path.join(ROOT, "tests", "fixtures", "bfs");

test("Phase C Alpha 3 besitzt versionierte Profilbibliothek und Provenance Layer", () => {
  assert.equal(fs.existsSync(path.join(ROOT,"src/backend/data/bfs/profiles/profile-library.mjs")), true);
  assert.equal(fs.existsSync(path.join(ROOT,"src/backend/data/bfs/provenance/provenance.mjs")), true);
  assert.ok(DOMAIN.BFS_FILE_PROFILES.length >= 10);
  DOMAIN.BFS_FILE_PROFILES.forEach(profile => { assert.ok(profile.id); assert.equal(profile.version, 1); assert.ok(profile.dataset); });
});

test("BUA Wide Import speichert Quelldatei Blatt Rohzelle Profil und Mappingmethode", () => {
  const matrix=[["Titel",""],["NOGA / Wirtschaftsabteilung","2028"],["49 Komplett neue BFS Benennung","41,3"]];
  const adapted=DOMAIN.adaptBfsTable({dataset:"BUA",matrix,source:{sourceFile:"bua-2028.xlsx",title:"BUA 2028"},sheetName:"Tabelle 1"});
  assert.equal(adapted.status,"ready"); assert.equal(adapted.profileId,"bua-wide-years-v1");
  const raw=adapted.pkg.rows[0]; assert.equal(raw.__provenance.rawCell,"B3"); assert.equal(raw.__provenance.sheetName,"Tabelle 1");
  const result=DOMAIN.importBfsRawPackage({pkg:adapted.pkg,currentData:base,aliases});
  const key="workHoursBranch.49 Landverkehr und Transport in Rohrfernleitungen.2028";
  assert.equal(result.status,"ready"); assert.equal(result.provenance.entries[key].source.rawCell,"B3"); assert.equal(result.provenance.entries[key].mappingMethod,"noga-code");
});

test("repräsentative TA01 Matrix wird über versioniertes Wide Profil erkannt", () => {
  const matrix=[["NOGA / Wirtschaftsabteilung","2028 Männer Kompetenzniveau 1","2028 Frauen Kompetenzniveau 1"],["49 Test",7000,6800]];
  const a=DOMAIN.adaptBfsTable({dataset:"LSE_TA01",matrix,source:{sourceFile:"ta01.xlsx"},sheetName:"TA01"});
  assert.equal(a.status,"ready"); assert.equal(a.profileId,"lse-ta01-wide-v1"); assert.equal(a.pkg.rows.length,2); assert.equal(a.pkg.rows[0].__provenance.rawCell,"B2");
});

test("repräsentative T17 und TA11 Matrixprofile werden erkannt", () => {
  const t17=DOMAIN.adaptBfsTable({dataset:"LSE_T17",matrix:[["Berufsgruppe","2028 Männer","2028 Frauen"],["1 Führungskräfte",11000,9500]]});
  assert.equal(t17.status,"ready"); assert.equal(t17.profileId,"lse-t17-wide-v1"); assert.equal(t17.pkg.rows.length,2);
  const ta11=DOMAIN.adaptBfsTable({dataset:"LSE_TA11",matrix:[["Ausbildung","2028 Männer Kompetenzniveau 1+2","2028 Frauen Kompetenzniveau 1+2"],["Universitäre Hochschule (UNI, ETH)",15000,14000]]});
  assert.equal(ta11.status,"ready"); assert.equal(ta11.profileId,"lse-ta11-wide-v1"); assert.equal(ta11.pkg.rows[0].skill,"1+2");
});

test("XLSX Extraktor kann alle sichtbaren Tabellenblätter liefern", () => {
  const out=execFileSync("python",[path.join(ROOT,"scripts","bfs_extract_table.py"),path.join(FIX,"files","bua-multi-sheet.xlsx"),"--all-sheets"],{encoding:"utf8"});
  const parsed=JSON.parse(out); assert.equal(parsed.sheets.length,2); assert.deepEqual(parsed.sheets.map(s=>s.sheetName),["Hinweise","BUA Daten"]);
});

test("File Dry Run wählt automatisch das fachlich passende Tabellenblatt", () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-bfs-sheet-"));
  const out=execFileSync(process.execPath,[path.join(ROOT,"scripts","bfs_file_import.js"),"--input",path.join(FIX,"files","bua-multi-sheet.xlsx"),"--dataset","BUA","--out-dir",tmp],{cwd:ROOT,encoding:"utf8"});
  const summary=JSON.parse(out); assert.equal(summary.status,"ready"); assert.equal(summary.sheetName,"BUA Daten"); assert.equal(summary.profileId,"bua-wide-years-v1");
  const prov=JSON.parse(fs.readFileSync(summary.files.provenance,"utf8")); const entry=Object.values(prov.entries)[0]; assert.equal(entry.source.sheetName,"BUA Daten"); assert.equal(entry.source.rawCell,"B3");
});

test("Import Manifest bündelt zeitversetzte BFS Lieferungen in einen gemeinsamen Candidate", () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-bfs-manifest-"));
  const baseFile=path.join(ROOT,"src","backend","data","base-data.json"); const before=fs.readFileSync(baseFile,"utf8");
  const out=execFileSync(process.execPath,[path.join(ROOT,"scripts","bfs_release_manifest.js"),"--manifest",path.join(FIX,"release-manifest-alpha3.json"),"--out-dir",tmp],{cwd:ROOT,encoding:"utf8"});
  const summary=JSON.parse(out); assert.equal(summary.status,"ready"); assert.equal(summary.entries.length,2); assert.equal(fs.existsSync(summary.files.candidate),true); assert.equal(fs.existsSync(summary.files.provenance),true);
  const audit=JSON.parse(fs.readFileSync(summary.files.manifestAudit,"utf8")); assert.equal(audit.status,"ready"); assert.ok(audit.provenanceEntries>=2); assert.equal(fs.readFileSync(baseFile,"utf8"),before);
});

test("Provenance Index erkennt widersprüchliche Herkunft für denselben kanonischen Pfad", () => {
  const a={schemaVersion:1,entries:{"x.y":{value:1,source:{rawCell:"A1"}}}}; const b={schemaVersion:1,entries:{"x.y":{value:2,source:{rawCell:"B1"}}}};
  const merged=DOMAIN.mergeProvenanceIndexes([a,b]); assert.equal(merged.conflicts.length,1);
});
