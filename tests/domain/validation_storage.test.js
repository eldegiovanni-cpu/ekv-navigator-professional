"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateEkvCase,
  findPeriodOverlaps,
  movePeriod,
  periodsOverlap,
  PERIOD_SCHEMA_VERSION,
  WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
  WORKSPACE_STORE_SCHEMA_VERSION,
  migrateWorkspaceSnapshot,
  migrateWorkspaceStore,
  filterWorkspaceEntries,
  getWorkspaceAgeDays,
  isOldWorkspace,
  parseWorkspaceStore,
  partitionWorkspaces,
  removeWorkspace,
  upsertWorkspace
} = require("../../generated/cjs/domain.cjs");

const NOW = new Date("2026-08-10T12:00:00Z");
const snapshot = savedAt => ({ schemaVersion: 3, savedAt, activeTab: "tab-ekv", currentFormState: {}, savedPeriods: [] });

test("offene Zeitperiode ist in der Vollständigkeitsprüfung zulässig", () => {
  const result = validateEkvCase({
    periodFrom: "2026-01-01",
    validIncome: 100000,
    invalidIncome: 50000,
    validDetail: "Berechnung vorhanden",
    invalidDetail: "Berechnung vorhanden",
    validReason: "Begründung",
    invalidReason: "Begründung",
    employeeName: "Mitarbeiter",
    editDate: "2026-08-10"
  });
  assert.equal(result.complete, true);
  assert.deepEqual(result.issues, []);
});

test("fehlendes Startdatum wird erkannt", () => {
  const result = validateEkvCase({ validIncome: 100000, invalidIncome: 50000 });
  assert.ok(result.issues.includes("Das Startdatum der Zeitperiode ist noch nicht erfasst."));
});

test("IVE über VE erzeugt denselben Spezialfallhinweis wie Referenz", () => {
  const result = validateEkvCase({ validIncome: 80000, invalidIncome: 90000 });
  assert.ok(result.issues.some(issue => issue.startsWith("Spezialfall:")));
});

test("gemischte Methode verlangt Summe 100 Prozent", () => {
  const result = validateEkvCase({ method: "mixed", employmentSharePercent: 70, householdSharePercent: 20, householdLimitationRaw: "10" });
  assert.ok(result.issues.some(issue => issue.includes("zusammen 100 Prozent")));
});

test("gemischte Methode verlangt Haushaltseinschränkung", () => {
  const result = validateEkvCase({ method: "mixed", employmentSharePercent: 80, householdSharePercent: 20, householdLimitationRaw: "" });
  assert.ok(result.issues.some(issue => issue.includes("Einschränkung im Haushalt")));
});

test("überlappende Zeitperioden werden erkannt", () => {
  assert.equal(periodsOverlap("2026-01-01", "2026-06-30", "2026-06-01", "2026-12-31"), true);
  assert.equal(periodsOverlap("2026-01-01", "2026-03-31", "2026-04-01", "2026-12-31"), false);
});

test("offene Zeitperiode überlappt spätere Periode", () => {
  assert.equal(periodsOverlap("2026-01-01", "", "2027-01-01", "2027-12-31"), true);
});

test("Perioden können stabil verschoben werden", () => {
  assert.deepEqual(movePeriod([{ id: "a" }, { id: "b" }], "b", -1).map(x => x.id), ["b", "a"]);
});

test("Overlap Suche kann eigene Periode ignorieren", () => {
  const periods = [{ id: "a", periodeVon: "2026-01-01", periodeBis: "2026-12-31" }];
  assert.equal(findPeriodOverlaps(periods, periods[0], "a").length, 0);
});

test("alter Arbeitsstand wird auf aktuelles Snapshot Schema migriert", () => {
  const legacy = { fields: { "ekv-valid": "80000" }, savedPeriods: [{ periodeVon: "2026-01-01", periodeBis: "" }] };
  const result = migrateWorkspaceSnapshot(legacy);
  assert.equal(result.snapshot.schemaVersion, WORKSPACE_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(result.snapshot.savedPeriods[0].schemaVersion, PERIOD_SCHEMA_VERSION);
  assert.ok(result.snapshot.savedPeriods[0].id);
});

test("alter Workspace Store wird auf Schema 2 migriert", () => {
  const legacy = { FallA: { fields: { "ekv-valid": "80000" }, savedPeriods: [] } };
  const result = migrateWorkspaceStore(legacy);
  assert.equal(result.store.schemaVersion, WORKSPACE_STORE_SCHEMA_VERSION);
  assert.ok(result.store.workspaces.FallA);
});

test("Arbeitsstand ist exakt ab 30 Tagen in der Kontrollliste", () => {
  const saved = snapshot("2026-07-11T12:00:00Z");
  assert.equal(getWorkspaceAgeDays(saved, NOW), 30);
  assert.equal(isOldWorkspace(saved, NOW), true);
});

test("29 Tage alter Arbeitsstand bleibt aktuell", () => {
  const saved = snapshot("2026-07-12T12:00:00Z");
  assert.equal(getWorkspaceAgeDays(saved, NOW), 29);
  assert.equal(isOldWorkspace(saved, NOW), false);
});

test("Workspace Partition trennt aktuelle und alte Einträge", () => {
  const result = partitionWorkspaces({ Neu: snapshot("2026-08-01T12:00:00Z"), Alt: snapshot("2026-06-01T12:00:00Z") }, NOW);
  assert.equal(result.current.length, 1);
  assert.equal(result.old.length, 1);
  assert.equal(result.oldCount, 1);
  assert.equal(result.old[0][0], "Alt");
});

test("Workspace Suche filtert unabhängig von Gross und Kleinschreibung", () => {
  const entries = [["Fall Alpha", snapshot("2026-08-01T12:00:00Z")], ["Beta", snapshot("2026-08-01T12:00:00Z")]];
  assert.equal(filterWorkspaceEntries(entries, "alpha").length, 1);
});

test("leerer Workspace Store wird sauber initialisiert", () => {
  const store = parseWorkspaceStore(null);
  assert.equal(store.schemaVersion, WORKSPACE_STORE_SCHEMA_VERSION);
  assert.deepEqual(store.workspaces, {});
});

test("Arbeitsstand kann ergänzt und entfernt werden", () => {
  let store = upsertWorkspace({}, "Fall A", snapshot("2026-08-09T12:00:00Z"));
  assert.ok(store.workspaces["Fall A"]);
  store = removeWorkspace(store, "Fall A");
  assert.deepEqual(store.workspaces, {});
});

test("ungültiges Workspace JSON wird nicht still akzeptiert", () => {
  assert.throws(() => parseWorkspaceStore("{kaputt"), /ungültiges JSON/);
});
