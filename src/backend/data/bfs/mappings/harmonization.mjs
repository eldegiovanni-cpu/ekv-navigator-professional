/* Developer Architecture 3.0: BFS harmonization. */
import { EKV_RULES } from "../../../domain/rules/ekv-rules.mjs";

function normalizeBfsLabel(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*([,;:/()])\s*/g, "$1")
    .replace(/\b(v\.|von)\b/gi, "von")
    .replace(/\b(u\.|und)\b/gi, "und")
    .replace(/\b(sonst\.|sonstige[nrms]?)\b/gi, "sonstige")
    .trim()
    .toLocaleLowerCase("de-CH");
}

function extractNogaCode(value) {
  const text = String(value ?? "")
    .replace(/[–—−]/g, "-")
    .trim();
  const match = text.match(/^(\d{1,2}(?:\s*,\s*\d{1,2})?(?:\s*-\s*\d{1,2})?)/);
  return match ? match[1].replace(/\s+/g, "") : "";
}

function getCanonicalBranchLabels(data) {
  const maintained = Array.isArray(data?.incomeBranches) ? data.incomeBranches.filter(Boolean) : [];
  if (maintained.length) return Array.from(new Set(maintained));

  const labels = new Set();
  Object.keys(data?.workHoursBranch || {}).forEach(label => labels.add(label));
  Object.values(data?.indexData || {}).forEach(group => Object.keys(group || {}).forEach(label => labels.add(label)));
  return Array.from(labels);
}

function buildBranchResolver(data, aliasConfig = {}) {
  const canonical = getCanonicalBranchLabels(data);
  const exact = new Map(canonical.map(label => [label, label]));
  const normalized = new Map();
  const byCode = new Map();
  const ambiguousNormalized = new Set();
  const ambiguousCodes = new Set();

  canonical.forEach(label => {
    const norm = normalizeBfsLabel(label);
    if (normalized.has(norm) && normalized.get(norm) !== label) ambiguousNormalized.add(norm);
    else normalized.set(norm, label);
    const code = extractNogaCode(label);
    if (code) {
      if (byCode.has(code) && byCode.get(code) !== label) ambiguousCodes.add(code);
      else byCode.set(code, label);
    }
  });

  const aliases = new Map(Object.entries(aliasConfig?.aliases || {}));
  return { canonical, exact, normalized, byCode, ambiguousNormalized, ambiguousCodes, aliases };
}

function resolveCanonicalBranch(data, rawLabel, aliasConfig = {}) {
  const raw = String(rawLabel ?? "").trim();
  if (!raw) return { status: "unresolved", raw, canonical: null, method: "empty" };
  const resolver = buildBranchResolver(data, aliasConfig);

  if (resolver.exact.has(raw)) return { status: "matched", raw, canonical: raw, method: "exact" };

  const explicit = resolver.aliases.get(raw);
  if (explicit && resolver.exact.has(explicit)) {
    return { status: "matched", raw, canonical: explicit, method: "alias" };
  }

  const norm = normalizeBfsLabel(raw);
  if (!resolver.ambiguousNormalized.has(norm) && resolver.normalized.has(norm)) {
    return { status: "matched", raw, canonical: resolver.normalized.get(norm), method: "normalized" };
  }

  const code = extractNogaCode(raw);
  if (code && !resolver.ambiguousCodes.has(code) && resolver.byCode.has(code)) {
    return { status: "matched", raw, canonical: resolver.byCode.get(code), method: "noga-code" };
  }

  return { status: "unresolved", raw, canonical: null, method: code ? "noga-code-unresolved" : "label-unresolved" };
}

function harmonizeBranchMap(rawMap, data, aliasConfig = {}) {
  const output = {};
  const mappings = [];
  const unresolved = [];
  const collisions = [];

  Object.entries(rawMap || {}).forEach(([rawLabel, value]) => {
    const resolved = resolveCanonicalBranch(data, rawLabel, aliasConfig);
    if (resolved.status !== "matched") {
      unresolved.push(rawLabel);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(output, resolved.canonical) && rawLabel !== resolved.canonical) {
      collisions.push({ raw: rawLabel, canonical: resolved.canonical });
      return;
    }
    output[resolved.canonical] = value;
    mappings.push(resolved);
  });
  return { data: output, mappings, unresolved, collisions };
}

function harmonizeDataBasis(data, aliasConfig = {}) {
  const report = { mappings: [], unresolved: [], collisions: [] };
  const applyMap = map => {
    const result = harmonizeBranchMap(map, data, aliasConfig);
    report.mappings.push(...result.mappings.filter(item => item.method !== "exact"));
    report.unresolved.push(...result.unresolved);
    report.collisions.push(...result.collisions);
    return result.data;
  };

  if (data?.workHoursBranch) data.workHoursBranch = applyMap(data.workHoursBranch);
  Object.keys(data?.indexData || {}).forEach(gender => {
    data.indexData[gender] = applyMap(data.indexData[gender]);
  });
  const ta01 = data?.modes?.TA01;
  if (ta01?.lseData) {
    Object.keys(ta01.lseData).forEach(year => {
      ta01.lseData[year] = applyMap(ta01.lseData[year]);
    });
    ta01.branches = getCanonicalBranchLabels(data).filter(label => {
      return Object.values(ta01.lseData).some(yearMap => Object.prototype.hasOwnProperty.call(yearMap || {}, label));
    });
  }

  const unique = values => Array.from(new Set(values));
  report.unresolved = unique(report.unresolved);
  return report;
}

function auditDataNaming(data, aliasConfig = {}) {
  const canonical = new Set(data?.incomeBranches || []);
  const result = { valid: true, issues: [], datasets: {} };
  const auditMap = (name, map) => {
    const keys = Object.keys(map || {});
    const missing = keys.filter(label => !canonical.has(label));
    result.datasets[name] = { rows: keys.length, nonCanonical: missing };
    if (missing.length) {
      result.valid = false;
      result.issues.push(`${name}: ${missing.length} nicht kanonische Bezeichnungen.`);
    }
  };
  auditMap("Betriebsübliche Arbeitszeiten", data?.workHoursBranch);
  Object.keys(data?.indexData || {}).forEach(gender => auditMap(`Nominallohnindex ${gender}`, data.indexData[gender]));
  return result;
}

export {
  auditDataNaming,
  buildBranchResolver,
  extractNogaCode,
  getCanonicalBranchLabels,
  harmonizeBranchMap,
  harmonizeDataBasis,
  normalizeBfsLabel,
  resolveCanonicalBranch
};
