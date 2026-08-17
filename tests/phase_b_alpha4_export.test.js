"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const DOMAIN = require("../generated/cjs/domain.cjs");
const manifest = JSON.parse(read("src/build-manifest.json"));

const exportFiles = {
  snapshot: "src/frontend/features/export/export-snapshot-adapter.js",
  legacy: "src/frontend/features/export/legacy-export-adapter.js",
  shared: "src/frontend/features/export/export-renderer-shared.js",
  pdf: "src/frontend/features/export/pdf-export-renderer.js",
  word: "src/frontend/features/export/word-export-renderer.js",
  controller: "src/frontend/features/export/export-controller.js",
  contract: "src/backend/domain/contracts/export-document.mjs"
};

test("Alpha 4 entfernt den Export Monolithen und trennt Verantwortlichkeiten", () => {
  assert.equal(exists("src/frontend/features/export/document-export.js"), false);
  Object.values(exportFiles).forEach(rel => assert.equal(exists(rel), true, rel));
  assert.ok(read(exportFiles.controller).split(/\r?\n/).length < 230);
  assert.ok(read(exportFiles.pdf).split(/\r?\n/).length < 170);
  assert.ok(read(exportFiles.word).split(/\r?\n/).length < 180);
});

test("Neue Exporte lesen keine gerenderten Ergebnisboxen zurück", () => {
  const currentPath = [exportFiles.snapshot, exportFiles.pdf, exportFiles.word, exportFiles.controller]
    .map(read).join("\n");
  assert.doesNotMatch(currentPath, /box3Html/);
  assert.doesNotMatch(currentPath, /ekv-valid-display|ekv-invalid-display|ekv-grade|ekv-final-grade/);
  assert.doesNotMatch(read(exportFiles.pdf), /document\.getElementById/);
  assert.doesNotMatch(read(exportFiles.word), /document\.getElementById/);
  assert.match(read(exportFiles.snapshot), /calculateEkvCase\(/);
  assert.match(read(exportFiles.snapshot), /validateEkvCase\(/);
});

test("Legacy HTML Parsing ist auf einen expliziten Adapter begrenzt", () => {
  const runtimeFiles = manifest.module_order.map(rel => `src/${rel}`);
  const boxReaders = runtimeFiles.filter(rel => /box3Html/.test(read(rel)));
  assert.ok(boxReaders.includes("src/frontend/features/export/legacy-export-adapter.js"));
  assert.equal(boxReaders.filter(rel => rel.startsWith("src/frontend/features/export/")).length, 1);
  assert.match(read(exportFiles.legacy), /legacyPeriodToExportSnapshot/);
  assert.match(read(exportFiles.legacy), /legacyConverted:\s*true/);
});

test("Gespeicherte neue Zeitperioden enthalten ein strukturiertes Export Snapshot", () => {
  const controller = read("src/frontend/features/periods/period-controller.js");
  assert.match(controller, /capturePeriodExportSnapshot\(/);
  assert.match(controller, /exportSnapshot,/);
  assert.match(read(exportFiles.snapshot), /PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION/);
});

test("Exportvertrag ist browserunabhängig und versioniert", () => {
  const contract = read(exportFiles.contract);
  assert.doesNotMatch(contract, /document\.|window\.|DOMParser|localStorage/);
  assert.equal(DOMAIN.EXPORT_DOCUMENT_SCHEMA_VERSION, 1);
  assert.equal(DOMAIN.PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION, 1);
  assert.equal(typeof DOMAIN.createExportDocumentModel, "function");
});

test("Strukturiertes Exportmodell normalisiert reine und gemischte Perioden", () => {
  const pureSnapshot = {
    schemaVersion: 1,
    periodFrom: "2026-01-01",
    periodTo: "",
    creator: { employeeName: "Test", editDate: "2026-08-15" },
    method: "pure",
    metrics: {
      valid: { value: "CHF 80'000.00", source: "Lohn direkt" },
      invalid: { value: "CHF 40'000.00", source: "Lohn direkt" },
      loss: { value: "CHF 40'000.00" },
      grade: { value: "50%" }
    },
    details: { validHtml: "VE", invalidHtml: "IVE" },
    reasons: { validText: "Grund VE", invalidText: "Grund IVE" }
  };
  const model = DOMAIN.createExportDocumentModel({
    workspaceName: "Fall A",
    periods: [{ id: "p1", periodeVon: "2026-01-01", periodeBis: "", exportSnapshot: pureSnapshot }]
  });
  assert.equal(model.workspaceName, "Fall A");
  assert.equal(model.periods.length, 1);
  assert.equal(model.periods[0].metrics.grade.value, "50%");
  assert.equal(model.periods[0].metrics.finalGrade, null);
  assert.equal(model.periods[0].periodFrom, "2026-01-01");
});

test("Altbestände benötigen explizit einen Legacy Adapter", () => {
  assert.throws(() => DOMAIN.createExportDocumentModel({ periods: [{ id: "alt" }] }), /strukturierten Export Snapshot/);
  const model = DOMAIN.createExportDocumentModel({
    periods: [{ id: "alt", periodeVon: "2025-01-01" }],
    legacyAdapter: period => ({
      schemaVersion: 1,
      periodId: period.id,
      periodFrom: period.periodeVon,
      method: "pure",
      metrics: { valid:{value:"1"}, invalid:{value:"0"}, loss:{value:"1"}, grade:{value:"100%"} },
      details: {}, reasons: {}, legacyConverted: true
    })
  });
  assert.equal(model.periods[0].legacyConverted, true);
});

test("RC1.3 Word Export folgt der PDF Leselogik ohne Textkompression", () => {
  const word = read(exportFiles.word);
  const controller = read(exportFiles.controller);
  assert.match(word, /renderWordClipboardFragment/);
  assert.doesNotMatch(word, /overflow\s*:\s*hidden/i);
  assert.doesNotMatch(word, /font-size\s*:\s*6(?:\.|pt)/i);
  assert.doesNotMatch(word, /word-detail-cell|word-reason-cell/);
  const validTrace = word.indexOf('Nachvollziehbarkeit Valideneinkommen');
  const validReason = word.indexOf('Begründung Valideneinkommen');
  const invalidTrace = word.indexOf('Nachvollziehbarkeit Invalideneinkommen');
  const invalidReason = word.indexOf('Begründung Invalideneinkommen');
  assert.ok(validTrace > 0 && validTrace < validReason);
  assert.ok(validReason < invalidTrace);
  assert.ok(invalidTrace < invalidReason);
  assert.match(controller, /return renderWordClipboardFragment\(getStructuredExportDocument\(\)\)/);
  assert.match(controller, /innerText \|\| tmp\.textContent/);
});
