/* Frontend backend adapter. This is the only frontend module allowed to access window.EKV_BACKEND_API. */
const BACKEND_CLIENT = (() => {
  const api = window.EKV_BACKEND_API;
  if (!api || api.apiVersion !== "1.0.0") {
    throw new Error("EKV Backend API ist nicht verfügbar oder inkompatibel.");
  }
  return api;
})();

// Read-only frontend catalog references exposed exclusively through the backend contract.
const DATA = BACKEND_CLIENT.catalog;
const BRANCH_ALIASES = BACKEND_CLIENT.aliases;
const DATA_HARMONIZATION_REPORT = BACKEND_CLIENT.audit.harmonization;
const DATA_NAMING_AUDIT = BACKEND_CLIENT.audit.naming;
const yearsStat = [...BACKEND_CLIENT.years.statistical];
const yearsIncome = [...BACKEND_CLIENT.years.income];

function syncYearArraysFromData() {
  yearsStat.splice(0, yearsStat.length, ...BACKEND_CLIENT.years.statistical);
  yearsIncome.splice(0, yearsIncome.length, ...BACKEND_CLIENT.years.income);
}

// Explicit compatibility aliases. They delegate to the backend public API only.
const PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION = BACKEND_CLIENT.PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION;
const PERIOD_SCHEMA_VERSION = BACKEND_CLIENT.PERIOD_SCHEMA_VERSION;
const WORKSPACE_SNAPSHOT_SCHEMA_VERSION = BACKEND_CLIENT.WORKSPACE_SNAPSHOT_SCHEMA_VERSION;
const WORKSPACE_STORAGE_KEY = BACKEND_CLIENT.WORKSPACE_STORAGE_KEY;
const WORKSPACE_STORE_SCHEMA_VERSION = BACKEND_CLIENT.WORKSPACE_STORE_SCHEMA_VERSION;
const calculateDirectIncome = BACKEND_CLIENT.calculateDirectIncome;
const calculateEkvCase = BACKEND_CLIENT.calculateEkvCase;
const calculateIncomeAverage = BACKEND_CLIENT.calculateIncomeAverage;
const calculateIncomeRow = BACKEND_CLIENT.calculateIncomeRow;
const calculateInvalidStatisticalIncome = BACKEND_CLIENT.calculateInvalidStatisticalIncome;
const calculateValidStatisticalIncome = BACKEND_CLIENT.calculateValidStatisticalIncome;
const calculateWageResults = BACKEND_CLIENT.calculateWageResults;
const createExportDocumentModel = BACKEND_CLIENT.createExportDocumentModel;
const createWorkspaceStore = BACKEND_CLIENT.createWorkspaceStore;
const filterWorkspaceEntries = BACKEND_CLIENT.filterWorkspaceEntries;
const fmtMoney = BACKEND_CLIENT.fmtMoney;
const fmtNum = BACKEND_CLIENT.fmtNum;
const fmtPct = BACKEND_CLIENT.fmtPct;
const getWorkspaceAgeDays = BACKEND_CLIENT.getWorkspaceAgeDays;
const getWorkspaceOperationalStatus = BACKEND_CLIENT.getWorkspaceOperationalStatus;
const getWorkspaceSavedTimestamp = BACKEND_CLIENT.getWorkspaceSavedTimestamp;
const getAvailableStatisticalYears = BACKEND_CLIENT.getAvailableStatisticalYears;
const hasCompleteStatisticalBase = BACKEND_CLIENT.hasCompleteStatisticalBase;
const migratePeriod = BACKEND_CLIENT.migratePeriod;
const migrateWorkspaceSnapshot = BACKEND_CLIENT.migrateWorkspaceSnapshot;
const migrateWorkspaceStore = BACKEND_CLIENT.migrateWorkspaceStore;
const movePeriod = BACKEND_CLIENT.movePeriod;
const normalizeActiveTab = BACKEND_CLIENT.normalizeActiveTab;
const normalizeBfsLabel = BACKEND_CLIENT.normalizeBfsLabel;
const partitionWorkspaces = BACKEND_CLIENT.partitionWorkspaces;
const periodsOverlap = BACKEND_CLIENT.periodsOverlap;
const removeWorkspace = BACKEND_CLIENT.removeWorkspace;
const round = BACKEND_CLIENT.round;
const selectWageResult = BACKEND_CLIENT.selectWageResult;
const upsertWorkspace = BACKEND_CLIENT.upsertWorkspace;
const validateEkvCase = BACKEND_CLIENT.validateEkvCase;

// Legacy signatures accepted by existing frontend feature modules; data ownership remains backend-side.
function getIncomeIndex(_data, branch, gender, year) {
  return BACKEND_CLIENT.getIncomeIndex(branch, gender, year);
}
function getModeConfig(_data, mode) {
  return BACKEND_CLIENT.getModeConfig(mode);
}
function sourceYearLabel(_data, mode, year) {
  return BACKEND_CLIENT.sourceYearLabel(mode, year);
}
function calculateStatisticalBase(_data, input) {
  return BACKEND_CLIENT.calculateStatisticalBase(input);
}
