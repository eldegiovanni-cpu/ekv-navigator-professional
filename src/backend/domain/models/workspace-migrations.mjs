/* Developer Architecture 3.0: versioned workspace migrations. */
const WORKSPACE_STORAGE_KEY = "ekvToolSavedWorkspaces";
const WORKSPACE_STORE_SCHEMA_VERSION = 2;
const WORKSPACE_SNAPSHOT_SCHEMA_VERSION = 4;
const PERIOD_SCHEMA_VERSION = 2;

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function copyObject(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function normalizeActiveTab(value) {
  return "tab-ekv";
}

function migratePeriod(period, index = 0) {
  const source = copyObject(period);
  const from = typeof source.periodeVon === "string" ? source.periodeVon : "";
  const to = typeof source.periodeBis === "string" ? source.periodeBis : "";
  const fallbackId = `period-migrated-${index + 1}-${from || "ohne-datum"}-${to || "offen"}`;

  return {
    ...source,
    schemaVersion: PERIOD_SCHEMA_VERSION,
    id: typeof source.id === "string" && source.id ? source.id : fallbackId,
    periodeVon: from,
    periodeBis: to,
    formState: isPlainObject(source.formState) ? source.formState : null
  };
}

function migrateWorkspaceSnapshotV1ToV2(snapshot) {
  const source = copyObject(snapshot);
  const legacyFields = copyObject(source.fields);
  const currentFormState = isPlainObject(source.currentFormState)
    ? source.currentFormState
    : {
        values: legacyFields,
        incomeRows: { valid: [], invalid: [] },
        ekvState: copyObject(source.ekvState),
        flowDetails: copyObject(source.flowDetails),
        validDetailHtml: "",
        invalidDetailHtml: ""
      };

  return {
    ...source,
    schemaVersion: 2,
    currentFormState,
    savedPeriods: Array.isArray(source.savedPeriods) ? source.savedPeriods : []
  };
}


function normalizeWorkspaceSummary(summary, currentFormState, savedPeriods) {
  const source = copyObject(summary);
  const values = copyObject(currentFormState?.values);
  const validIncome = Number(source.validIncome ?? values["ekv-valid"] ?? 0) || 0;
  const invalidIncome = Number(source.invalidIncome ?? values["ekv-invalid"] ?? 0) || 0;
  const method = source.method === "mixed" || values["ekv-method"] === "mixed" ? "mixed" : "pure";
  const validReason = String(values["ekv-valid-reason"] || "").trim();
  const invalidReason = String(values["ekv-invalid-reason"] || "").trim();
  const employeeName = String(source.employeeName ?? values["ekv-employee-name"] ?? "").trim();
  const editDate = String(source.editDate ?? values["ekv-edit-date"] ?? "");
  const periodFrom = String(source.periodFrom ?? values["ekv-period-from"] ?? "");
  const periodTo = String(source.periodTo ?? values["ekv-period-to"] ?? "");
  const periodCount = Number.isInteger(source.periodCount) ? source.periodCount : (Array.isArray(savedPeriods) ? savedPeriods.length : 0);
  const hasCalculation = validIncome > 0 && invalidIncome >= 0;
  const documented = hasCalculation && !!validReason && !!invalidReason && !!employeeName && !!editDate && !!periodFrom;
  const derivedStatus = documented ? "documented" : (hasCalculation ? "calculated" : "incomplete");
  const status = ["documented", "calculated", "incomplete"].includes(source.status) ? source.status : derivedStatus;

  return {
    employeeName,
    editDate,
    method,
    validIncome,
    invalidIncome,
    gradePercent: Number.isFinite(Number(source.gradePercent)) ? Number(source.gradePercent) : null,
    validSource: String(source.validSource || currentFormState?.ekvState?.validSource || ""),
    invalidSource: String(source.invalidSource || currentFormState?.ekvState?.invalidSource || ""),
    periodFrom,
    periodTo,
    periodCount,
    status
  };
}

function migrateWorkspaceSnapshotV2ToV3(snapshot) {
  const source = copyObject(snapshot);
  const migrated = {
    schemaVersion: 3,
    savedAt: typeof source.savedAt === "string" ? source.savedAt : new Date(0).toISOString(),
    activeTab: normalizeActiveTab(source.activeTab),
    currentFormState: isPlainObject(source.currentFormState)
      ? source.currentFormState
      : {
          values: copyObject(source.fields),
          incomeRows: { valid: [], invalid: [] },
          ekvState: copyObject(source.ekvState),
          flowDetails: copyObject(source.flowDetails),
          validDetailHtml: "",
          invalidDetailHtml: ""
        },
    savedPeriods: (Array.isArray(source.savedPeriods) ? source.savedPeriods : [])
      .map((period, index) => migratePeriod(period, index))
  };

  return migrated;
}

function migrateWorkspaceSnapshotV3ToV4(snapshot) {
  const source = copyObject(snapshot);
  const currentFormState = isPlainObject(source.currentFormState) ? source.currentFormState : null;
  const savedPeriods = (Array.isArray(source.savedPeriods) ? source.savedPeriods : [])
    .map((period, index) => migratePeriod(period, index));
  return {
    ...source,
    schemaVersion: WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
    summary: normalizeWorkspaceSummary(source.summary, currentFormState, savedPeriods),
    savedPeriods
  };
}

const WORKSPACE_SNAPSHOT_MIGRATIONS = Object.freeze({
  1: migrateWorkspaceSnapshotV1ToV2,
  2: migrateWorkspaceSnapshotV2ToV3,
  3: migrateWorkspaceSnapshotV3ToV4
});

function detectWorkspaceSnapshotVersion(snapshot) {
  if (!isPlainObject(snapshot)) return 1;
  const explicitVersion = Number(snapshot.schemaVersion ?? snapshot.version);
  return Number.isInteger(explicitVersion) && explicitVersion > 0 ? explicitVersion : 1;
}

function migrateWorkspaceSnapshot(snapshot) {
  let current = copyObject(snapshot);
  let version = detectWorkspaceSnapshotVersion(current);
  let migrated = false;

  if (version > WORKSPACE_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Arbeitsstand Schemaversion ${version} wird von dieser Programmversion nicht unterstützt.`);
  }

  while (version < WORKSPACE_SNAPSHOT_SCHEMA_VERSION) {
    const migrate = WORKSPACE_SNAPSHOT_MIGRATIONS[version];
    if (!migrate) throw new Error(`Migration für Arbeitsstand Schemaversion ${version} fehlt.`);
    current = migrate(current);
    version = Number(current.schemaVersion);
    migrated = true;
  }

  const normalizedPeriods = (Array.isArray(current.savedPeriods) ? current.savedPeriods : [])
    .map((period, index) => migratePeriod(period, index));
  if (normalizedPeriods.some((period, index) =>
    period.schemaVersion !== current.savedPeriods?.[index]?.schemaVersion ||
    period.id !== current.savedPeriods?.[index]?.id
  )) {
    migrated = true;
  }

  return {
    snapshot: {
      schemaVersion: WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
      savedAt: typeof current.savedAt === "string" ? current.savedAt : new Date(0).toISOString(),
      activeTab: normalizeActiveTab(current.activeTab),
      currentFormState: isPlainObject(current.currentFormState) ? current.currentFormState : null,
      summary: normalizeWorkspaceSummary(current.summary, current.currentFormState, normalizedPeriods),
      savedPeriods: normalizedPeriods
    },
    migrated
  };
}

function migrateWorkspaceStoreV0ToV1(rawStore) {
  const legacyWorkspaces = copyObject(rawStore);
  return {
    schemaVersion: 1,
    updatedAt: null,
    workspaces: legacyWorkspaces
  };
}

function migrateWorkspaceStoreV1ToV2(rawStore) {
  const source = copyObject(rawStore);
  const workspaces = {};

  Object.entries(copyObject(source.workspaces)).forEach(([name, snapshot]) => {
    if (!name.trim() || !isPlainObject(snapshot)) return;
    workspaces[name] = migrateWorkspaceSnapshot(snapshot).snapshot;
  });

  return {
    schemaVersion: WORKSPACE_STORE_SCHEMA_VERSION,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
    workspaces
  };
}

const WORKSPACE_STORE_MIGRATIONS = Object.freeze({
  0: migrateWorkspaceStoreV0ToV1,
  1: migrateWorkspaceStoreV1ToV2
});

function detectWorkspaceStoreVersion(rawStore) {
  if (!isPlainObject(rawStore)) return 0;
  const explicitVersion = Number(rawStore.schemaVersion);
  if (Number.isInteger(explicitVersion) && isPlainObject(rawStore.workspaces)) return explicitVersion;
  return 0;
}

function migrateWorkspaceStore(rawStore) {
  let current = isPlainObject(rawStore) ? rawStore : {};
  let version = detectWorkspaceStoreVersion(current);
  let migrated = false;

  if (version > WORKSPACE_STORE_SCHEMA_VERSION) {
    throw new Error(`Speicher Schemaversion ${version} wird von dieser Programmversion nicht unterstützt.`);
  }

  while (version < WORKSPACE_STORE_SCHEMA_VERSION) {
    const migrate = WORKSPACE_STORE_MIGRATIONS[version];
    if (!migrate) throw new Error(`Migration für Speicher Schemaversion ${version} fehlt.`);
    current = migrate(current);
    version = Number(current.schemaVersion);
    migrated = true;
  }

  const workspaces = {};
  Object.entries(copyObject(current.workspaces)).forEach(([name, snapshot]) => {
    if (!name.trim() || !isPlainObject(snapshot)) return;
    const result = migrateWorkspaceSnapshot(snapshot);
    workspaces[name] = result.snapshot;
    migrated ||= result.migrated;
  });

  return {
    store: {
      schemaVersion: WORKSPACE_STORE_SCHEMA_VERSION,
      updatedAt: typeof current.updatedAt === "string" ? current.updatedAt : null,
      workspaces
    },
    migrated
  };
}

function createWorkspaceStore(workspaces) {
  const normalized = {};
  Object.entries(copyObject(workspaces)).forEach(([name, snapshot]) => {
    if (!name.trim() || !isPlainObject(snapshot)) return;
    normalized[name] = migrateWorkspaceSnapshot(snapshot).snapshot;
  });

  return {
    schemaVersion: WORKSPACE_STORE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    workspaces: normalized
  };
}

export {
  PERIOD_SCHEMA_VERSION,
  WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_STORE_SCHEMA_VERSION,
  createWorkspaceStore,
  normalizeWorkspaceSummary,
  migratePeriod,
  migrateWorkspaceSnapshot,
  migrateWorkspaceStore,
  normalizeActiveTab
};
