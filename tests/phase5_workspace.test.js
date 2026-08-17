"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(p, "utf8");
const {
  WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
  migrateWorkspaceSnapshot,
  filterWorkspaceEntries,
  getWorkspaceOperationalStatus,
  partitionWorkspaces
} = require("../generated/cjs/domain.cjs");

function snapshot(savedAt, summary = {}) {
  return {
    schemaVersion: WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
    savedAt,
    activeTab: "tab-ekv",
    currentFormState: { values: {}, incomeRows: { valid: [], invalid: [] }, ekvState: {}, flowDetails: {} },
    summary,
    savedPeriods: []
  };
}

test("Phase 5 Arbeitsstandsoberfläche enthält Übersicht, Karten und Kontrollliste", () => {
  const html = read(path.join(ROOT, "src", "frontend", "index.html"));
  [
    "workspace-manager",
    "workspace-total-count",
    "workspace-current-count",
    "workspace-review-count",
    "workspace-current-cards",
    "workspace-old-cards",
    "workspace-active-name",
    "workspace-active-state"
  ].forEach(id => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /Bitte kontrollieren oder Löschen – Älter als 30 Tage/);
});

test("Phase 5 Snapshot Schema ergänzt operationelle Zusammenfassung kompatibel", () => {
  const legacy = {
    schemaVersion: 3,
    savedAt: "2026-08-01T12:00:00Z",
    activeTab: "tab-ekv",
    currentFormState: {
      values: {
        "ekv-valid": "80000",
        "ekv-invalid": "40000",
        "ekv-method": "pure",
        "ekv-employee-name": "Fachperson",
        "ekv-edit-date": "2026-08-01",
        "ekv-period-from": "2026-01-01",
        "ekv-valid-reason": "Begründung",
        "ekv-invalid-reason": "Begründung"
      },
      ekvState: { validSource: "Quelle VE", invalidSource: "Quelle IVE" },
      flowDetails: { valid: "Berechnung VE", invalid: "Berechnung IVE" }
    },
    savedPeriods: []
  };
  const result = migrateWorkspaceSnapshot(legacy).snapshot;
  assert.equal(result.schemaVersion, WORKSPACE_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(result.summary.employeeName, "Fachperson");
  assert.equal(result.summary.validIncome, 80000);
  assert.equal(result.summary.invalidIncome, 40000);
  assert.equal(result.summary.status, "documented");
});

test("Phase 5 Suche berücksichtigt Fallmetadaten zusätzlich zur Bezeichnung", () => {
  const entries = [
    ["Fall A", snapshot("2026-08-09T12:00:00Z", { employeeName: "Anna Muster", method: "mixed", validSource: "TA01" })],
    ["Fall B", snapshot("2026-08-08T12:00:00Z", { employeeName: "Peter Beispiel", method: "pure", validSource: "AHV Einkommen" })]
  ];
  assert.equal(filterWorkspaceEntries(entries, "anna").length, 1);
  assert.equal(filterWorkspaceEntries(entries, "gemischte").length, 1);
  assert.equal(filterWorkspaceEntries(entries, "ahv").length, 1);
});

test("Phase 5 sortiert aktuelle Arbeitsstände nach letzter Speicherung und Kontrollfälle nach Alter", () => {
  const now = new Date("2026-08-10T12:00:00Z");
  const result = partitionWorkspaces({
    AktuellAlt: snapshot("2026-08-01T12:00:00Z"),
    AktuellNeu: snapshot("2026-08-09T12:00:00Z"),
    KontrolleNeu: snapshot("2026-06-20T12:00:00Z"),
    KontrolleAlt: snapshot("2026-05-01T12:00:00Z")
  }, now);
  assert.deepEqual(result.current.map(entry => entry[0]), ["AktuellNeu", "AktuellAlt"]);
  assert.deepEqual(result.old.map(entry => entry[0]), ["KontrolleAlt", "KontrolleNeu"]);
});

test("Phase 5 operationeller Status wird verständlich abgebildet", () => {
  assert.equal(getWorkspaceOperationalStatus(snapshot("2026-08-01T12:00:00Z", { status: "documented" })).label, "Dokumentiert");
  assert.equal(getWorkspaceOperationalStatus(snapshot("2026-08-01T12:00:00Z", { status: "calculated" })).label, "Berechnet");
  assert.equal(getWorkspaceOperationalStatus(snapshot("2026-08-01T12:00:00Z", { status: "incomplete" })).label, "In Bearbeitung");
});

test("Workspace Styles bleiben vor Datenkontrolle und Commercial Produktmodul erhalten", () => {
  const manifest = JSON.parse(read(path.join(ROOT, "src", "build-manifest.json")));
  assert.ok(manifest.style_order.indexOf("60-workspaces.css") < manifest.style_order.indexOf("70-data-inspector.css"));
  assert.ok(manifest.style_order.indexOf("70-data-inspector.css") < manifest.style_order.indexOf("80-commercial-product.css"));
  assert.equal(manifest.style_order.at(-1), "80-commercial-product.css");
  const css = read(path.join(ROOT, "src", "frontend", "styles", "60-workspaces.css"));
  assert.match(css, /\.phase5-workspace-overview/);
  assert.match(css, /\.phase5-case-card/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media print/);
});
