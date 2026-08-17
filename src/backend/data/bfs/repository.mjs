import { effectiveLseYear, indexGender, round } from "../../domain/calculations/calculations.mjs";
import { EKV_RULES } from "../../domain/rules/ekv-rules.mjs";
import { resolveCanonicalBranch } from "./mappings/harmonization.mjs";

export function createBfsRepository({ data, aliases = { aliases: {} } }) {
  if (!data || typeof data !== "object") throw new TypeError("BFS Datenbasis fehlt.");

  function getModeConfig(mode) { return data?.modes?.[mode] || data?.modes?.TA01 || null; }
  function canonicalBranch(branch) { return resolveCanonicalBranch(data, branch, aliases).canonical || branch; }

  function getLseSourceYears(mode) {
    const cfg = getModeConfig(mode);
    return Object.keys(cfg?.lseData || {})
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }

  function resolveLseSourceYear(mode, year) {
    const numericYear = Number(year);
    const years = getLseSourceYears(mode);
    if (!years.length) return effectiveLseYear(numericYear);
    const eligible = years.filter(candidate => candidate <= numericYear);
    return eligible.length ? eligible[eligible.length - 1] : years[0];
  }

  function sourceYearLabel(mode, year) {
    const cfg = getModeConfig(mode);
    return cfg ? `${cfg.sourcePrefix}${resolveLseSourceYear(mode, year)}` : "";
  }

  function getIncomeIndexInfo(branch, gender, year) {
    const mappedGender = indexGender(gender);
    const resolved = canonicalBranch(branch);
    const numericYear = Number(year);
    if (numericYear === 2010) {
      return { value: 100, year: numericYear, branch: resolved, gender: mappedGender, meta: null };
    }
    const numeric = Number(data?.indexData?.[mappedGender]?.[resolved]?.[String(numericYear)]);
    const value = Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    const meta = data?.indexMeta?.[mappedGender]?.[resolved]?.[String(numericYear)] || null;
    return { value, year: numericYear, branch: resolved, gender: mappedGender, meta };
  }

  function getIncomeIndex(branch, gender, year) {
    return getIncomeIndexInfo(branch, gender, year).value;
  }

  function getStatIndexInfo(mode, branch, gender, year) {
    return mode === "T17" || mode === "TA11"
      ? getIncomeIndexInfo(EKV_RULES.lse.totalIndexBranch, gender, year)
      : getIncomeIndexInfo(branch, gender, year);
  }

  function getStatIndex(mode, branch, gender, year) {
    return getStatIndexInfo(mode, branch, gender, year).value;
  }

  function getWorkHoursStatInfo(mode, branch, year) {
    const numericYear = Number(year);
    const resolved = canonicalBranch(branch);
    const fixed = data?.modes?.[mode]?.fixedWorkHours?.[String(numericYear)];
    const rawValue = fixed ?? data?.workHoursBranch?.[resolved]?.[String(numericYear)];
    const numeric = Number(rawValue);
    const value = Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    const meta = fixed !== undefined
      ? data?.modes?.[mode]?.fixedWorkHoursMeta?.[String(numericYear)] || null
      : data?.workHoursMeta?.[resolved]?.[String(numericYear)] || null;
    return { value, year: numericYear, branch: fixed !== undefined ? EKV_RULES.lse.totalIndexBranch : resolved, meta };
  }

  function getWorkHoursStat(mode, branch, year) {
    return getWorkHoursStatInfo(mode, branch, year).value;
  }

  function getBaseSalaryInfo(mode, gender, branch, skill, year) {
    const sourceYear = resolveLseSourceYear(mode, year);
    const resolvedBranch = mode === "TA01" ? canonicalBranch(branch) : branch;
    const table = data?.modes?.[mode]?.lseData?.[String(sourceYear)]?.[resolvedBranch];
    if (!table) return { value: null, sourceYear, branch: resolvedBranch, skill, gender, meta: null };

    if (mode === "TA01" && gender === "VE Frühinvalide") {
      if (resolvedBranch !== EKV_RULES.lse.totalIndexBranch) {
        return { value: 0, sourceYear, branch: resolvedBranch, skill: "Alle", gender: "Neutral", meta: null };
      }
      const value = Number(table?.Alle?.Neutral);
      const meta = data?.modes?.[mode]?.sourceMeta?.[String(sourceYear)]?.[resolvedBranch]?.Alle?.Neutral || null;
      return { value: Number.isFinite(value) ? value : null, sourceYear, branch: resolvedBranch, skill: "Alle", gender: "Neutral", meta };
    }

    const effectiveSkill = mode === "T17" ? "Alle" : String(skill);
    const cell = mode === "T17" ? table?.Alle?.[gender] : table?.[effectiveSkill]?.[gender];
    const value = Number(cell);
    const meta = data?.modes?.[mode]?.sourceMeta?.[String(sourceYear)]?.[resolvedBranch]?.[effectiveSkill]?.[gender] || null;
    return {
      value: Number.isFinite(value) ? value : null,
      sourceYear,
      branch: resolvedBranch,
      skill: effectiveSkill,
      gender,
      meta
    };
  }

  function getBaseSalary(mode, gender, branch, skill, year) {
    return getBaseSalaryInfo(mode, gender, branch, skill, year).value;
  }

  function getAvailableStatisticalYears(mode) {
    const sourceYears = getLseSourceYears(mode);
    if (!sourceYears.length) return [];
    const firstSourceYear = sourceYears[0];
    const firstTargetYear = mode === "TA11" ? Math.max(2010, firstSourceYear) : firstSourceYear;
    const indexYears = Object.keys(data?.indexData?.Neutral?.[EKV_RULES.lse.totalIndexBranch] || {})
      .map(Number).filter(Number.isFinite);
    const maxIndexYear = indexYears.length ? Math.max(...indexYears) : firstTargetYear;
    const years = [];
    for (let year = firstTargetYear; year <= maxIndexYear; year += 1) {
      const sourceYear = resolveLseSourceYear(mode, year);
      const sourceExists = Boolean(data?.modes?.[mode]?.lseData?.[String(sourceYear)]);
      const indexExists = getStatIndex(mode, EKV_RULES.lse.totalIndexBranch, "Neutral", year) !== null;
      const hoursExists = getWorkHoursStat(mode, EKV_RULES.lse.totalIndexBranch, year) !== null;
      if (sourceExists && indexExists && hoursExists) years.push(year);
    }
    return years;
  }

  function getRentInfo(grade) {
    const rounded = round(grade, 2);
    if (rounded < 0.4) return { old: "Kein Anspruch", neu: "Kein Anspruch" };
    const row = data?.rents?.[rounded.toFixed(2)];
    if (row) return { old: row.old, neu: row.new };
    return { old: rounded >= 0.7 ? "ganze Rente" : rounded >= 0.6 ? "3/4 Rente" : rounded >= 0.5 ? "1/2 Rente" : "1/4 Rente", neu: rounded };
  }

  function collectAvailableYears() {
    const years = new Set([2010]);
    Object.values(data?.indexData || {}).forEach(group => Object.values(group || {}).forEach(row => Object.keys(row || {}).forEach(year => years.add(Number(year)))));
    Object.values(data?.workHoursBranch || {}).forEach(row => Object.keys(row || {}).forEach(year => years.add(Number(year))));
    Object.values(data?.modes || {}).forEach(mode => {
      Object.keys(mode?.lseData || {}).forEach(year => years.add(Number(year)));
      Object.keys(mode?.fixedWorkHours || {}).forEach(year => years.add(Number(year)));
    });
    return Array.from(years).filter(Number.isFinite).sort((a, b) => a - b);
  }

  function validateDataBasis() {
    const issues = [];
    ["TA01", "T17", "TA11"].forEach(mode => { if (!data?.modes?.[mode]) issues.push(`LSE Modus ${mode} fehlt.`); });
    ["Neutral", "Mann", "Frau"].forEach(gender => { if (!data?.indexData?.[gender]) issues.push(`Indexdaten ${gender} fehlen.`); });
    if (!Array.isArray(data?.incomeBranches) || !data.incomeBranches.length) issues.push("Einkommensbranchen fehlen.");
    if (!data?.workHoursBranch || !Object.keys(data.workHoursBranch).length) issues.push("Betriebsübliche Wochenarbeitszeiten fehlen.");
    if (!data?.rents || !Object.keys(data.rents).length) issues.push("Rentenstaffel fehlt.");
    return { valid: issues.length === 0, issues };
  }

  return Object.freeze({
    getModeConfig,
    getLseSourceYears,
    resolveLseSourceYear,
    sourceYearLabel,
    getIncomeIndexInfo,
    getIncomeIndex,
    getStatIndexInfo,
    getStatIndex,
    getWorkHoursStatInfo,
    getWorkHoursStat,
    getBaseSalaryInfo,
    getBaseSalary,
    getAvailableStatisticalYears,
    getRentInfo,
    collectAvailableYears,
    validateDataBasis
  });
}

// Compatibility functions for the current UI. New feature modules should use createBfsRepository().
export function getModeConfig(data, mode) { return createBfsRepository({ data, aliases: { aliases: {} } }).getModeConfig(mode); }
export function resolveLseSourceYear(data, mode, year) { return createBfsRepository({ data, aliases: { aliases: {} } }).resolveLseSourceYear(mode, year); }
export function getAvailableStatisticalYears(data, mode) { return createBfsRepository({ data, aliases: { aliases: {} } }).getAvailableStatisticalYears(mode); }
export function sourceYearLabel(data, mode, year) { return createBfsRepository({ data, aliases: { aliases: {} } }).sourceYearLabel(mode, year); }
export function getIncomeIndex(data, branch, gender, year) { return createBfsRepository({ data, aliases: { aliases: {} } }).getIncomeIndex(branch, gender, year); }
export function getStatIndex(data, mode, branch, gender, year) { return createBfsRepository({ data, aliases: { aliases: {} } }).getStatIndex(mode, branch, gender, year); }
export function getWorkHoursStat(data, mode, branch, year) { return createBfsRepository({ data, aliases: { aliases: {} } }).getWorkHoursStat(mode, branch, year); }
export function getBaseSalary(data, mode, gender, branch, skill, year) { return createBfsRepository({ data, aliases: { aliases: {} } }).getBaseSalary(mode, gender, branch, skill, year); }
export function getRentInfo(data, grade) { return createBfsRepository({ data }).getRentInfo(grade); }
export function collectAvailableYears(data) { return createBfsRepository({ data }).collectAvailableYears(); }
export function validateDataBasis(data) { return createBfsRepository({ data }).validateDataBasis(); }
