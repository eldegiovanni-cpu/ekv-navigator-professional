// EKV Navigator Backend Public API
// Browser runtime exports exactly one public object: EKV_BACKEND_API.
// Internal domain/data modules remain hidden from the frontend bundle.

import { EKV_RULES } from "./domain/rules/ekv-rules.mjs";
import {
  round, fmtMoney, fmtNum, fmtPct, effectiveLseYear, indexGender,
  calculateInvalidStatisticalIncome, calculateValidStatisticalIncome,
  calculateStatisticalAnnual, hasCompleteStatisticalBase
} from "./domain/calculations/calculations.mjs";
import {
  calculateEkvComparison, calculateMixedMethod, calculateDirectIncome,
  calculateIncomeAverage, calculateIncomeRow, calculateWageResults, selectWageResult
} from "./domain/calculations/income-calculations.mjs";
import { calculateEkvCase } from "./domain/calculations/ekv-case.mjs";
import { validateEkvCase } from "./domain/validation/ekv-validation.mjs";
import {
  PERIOD_SCHEMA_VERSION, migratePeriod, movePeriod, periodsOverlap
} from "./domain/models/period-model.mjs";
import {
  WORKSPACE_SNAPSHOT_SCHEMA_VERSION, WORKSPACE_STORE_SCHEMA_VERSION, WORKSPACE_STORAGE_KEY,
  createWorkspaceStore, migrateWorkspaceSnapshot, migrateWorkspaceStore,
  normalizeActiveTab, normalizeWorkspaceSummary
} from "./domain/models/workspace-migrations.mjs";
import {
  filterWorkspaceEntries, getWorkspaceAgeDays, getWorkspaceOperationalStatus,
  getWorkspaceSavedTimestamp, partitionWorkspaces, removeWorkspace, upsertWorkspace
} from "./domain/models/workspace-model.mjs";
import {
  PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION, createExportDocumentModel
} from "./domain/contracts/export-document.mjs";
import { createWorkspaceStorageRepository } from "./infrastructure/storage/workspace-storage.mjs";
import {
  auditDataNaming, harmonizeDataBasis, normalizeBfsLabel
} from "./data/bfs/mappings/harmonization.mjs";
import {
  collectAvailableYears, getAvailableStatisticalYears, getIncomeIndex, getModeConfig, resolveLseSourceYear, sourceYearLabel, validateDataBasis
} from "./data/bfs/repository.mjs";
import { calculateStatisticalBase } from "./data/bfs/statistical-base.mjs";

// Keep development-only BFS pipeline modules part of the generated CJS backend used by tests/scripts.
import "./data/bfs/profiles/profile-library.mjs";
import "./data/bfs/provenance/provenance.mjs";
import "./data/bfs/pipeline/contracts.mjs";
import "./data/bfs/pipeline/category-resolver.mjs";
import "./data/bfs/pipeline/normalizers.mjs";
import "./data/bfs/pipeline/canonical-patch.mjs";
import "./data/bfs/pipeline/import-pipeline.mjs";
import "./data/bfs/pipeline/release-gate.mjs";
import "./data/bfs/adapters/tabular-file-adapter.mjs";

const cloneJson = value => JSON.parse(JSON.stringify(value));
const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
};

const rawData = globalThis.__EKV_DATA__ || {};
const aliases = globalThis.__EKV_BRANCH_ALIASES__ || { aliases: {} };
const data = cloneJson(rawData);
const harmonizationReport = harmonizeDataBasis(data, aliases);
const namingAudit = auditDataNaming(data, aliases);
const dataBasisAudit = validateDataBasis(data);
const availableYears = collectAvailableYears(data);
const years = Object.freeze({
  statistical: Object.freeze(getAvailableStatisticalYears(data, "TA01")),
  income: Object.freeze(availableYears.filter(year => year >= 2010))
});

deepFreeze(data);
deepFreeze(aliases);
deepFreeze(harmonizationReport);
deepFreeze(namingAudit);
deepFreeze(dataBasisAudit);

const browserWorkspaceStorage = Object.freeze({
  readStore() { return createWorkspaceStorageRepository(globalThis.localStorage).readStore(); },
  replaceWorkspaces(workspaces) { return createWorkspaceStorageRepository(globalThis.localStorage).replaceWorkspaces(workspaces); },
  save(name, snapshot) { return createWorkspaceStorageRepository(globalThis.localStorage).save(name, snapshot); },
  remove(name) { return createWorkspaceStorageRepository(globalThis.localStorage).remove(name); }
});

export const EKV_BACKEND_API = Object.freeze({
  apiVersion: "1.0.0",
  architecture: "frontend-backend-local",

  // Read-only application data and audits.
  catalog: data,
  aliases,
  years,
  audit: Object.freeze({
    harmonization: harmonizationReport,
    naming: namingAudit,
    dataBasis: dataBasisAudit
  }),
  rules: EKV_RULES,

  // Calculation service boundary.
  calculateEkvCase,
  validateEkvCase,
  calculateEkvComparison,
  calculateMixedMethod,
  calculateDirectIncome,
  calculateIncomeAverage,
  calculateIncomeRow,
  calculateWageResults,
  selectWageResult,
  calculateInvalidStatisticalIncome,
  calculateValidStatisticalIncome,
  calculateStatisticalAnnual,
  calculateStatisticalBase: input => calculateStatisticalBase(data, input, aliases),
  hasCompleteStatisticalBase,

  // BFS read service boundary. Data is owned by the backend.
  getIncomeIndex: (branch, gender, year) => getIncomeIndex(data, branch, gender, year),
  getModeConfig: mode => getModeConfig(data, mode),
  getAvailableStatisticalYears: mode => getAvailableStatisticalYears(data, mode),
  resolveLseSourceYear: (mode, year) => resolveLseSourceYear(data, mode, year),
  sourceYearLabel: (mode, year) => sourceYearLabel(data, mode, year),
  normalizeBfsLabel,

  // Presentation-safe formatting helpers kept in backend contract for exact parity.
  round,
  fmtMoney,
  fmtNum,
  fmtPct,
  effectiveLseYear,
  indexGender,

  // Browser persistence is owned by the backend infrastructure layer.
  workspaceStorage: browserWorkspaceStorage,
  createWorkspaceStorageRepository,

  // Period/workspace domain services.
  PERIOD_SCHEMA_VERSION,
  migratePeriod,
  movePeriod,
  periodsOverlap,
  WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
  WORKSPACE_STORE_SCHEMA_VERSION,
  WORKSPACE_STORAGE_KEY,
  createWorkspaceStore,
  migrateWorkspaceSnapshot,
  migrateWorkspaceStore,
  normalizeActiveTab,
  normalizeWorkspaceSummary,
  filterWorkspaceEntries,
  getWorkspaceAgeDays,
  getWorkspaceOperationalStatus,
  getWorkspaceSavedTimestamp,
  partitionWorkspaces,
  removeWorkspace,
  upsertWorkspace,

  // Export domain contract.
  PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION,
  createExportDocumentModel
});
