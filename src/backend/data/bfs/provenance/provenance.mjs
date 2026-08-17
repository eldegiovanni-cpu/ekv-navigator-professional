/* Phase C Alpha 3: revisionsfaehige Herkunftsinformationen fuer BFS Werte. */
import { canonicalPathForRow } from "../pipeline/canonical-patch.mjs";

function spreadsheetColumnName(index) {
  let n = Number(index) + 1;
  if (!Number.isInteger(n) || n < 1) return "";
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function createCellProvenance({ source = {}, sheetName = "", rawRow = null, rawColumn = null, categoryColumn = null, profile = null } = {}) {
  const cell = rawRow && Number.isInteger(rawColumn) ? `${spreadsheetColumnName(rawColumn)}${rawRow}` : "";
  return {
    sourceFile: String(source.sourceFile || ""),
    sourceTitle: String(source.title || ""),
    sheetName: String(sheetName || source.sheetName || ""),
    rawRow: Number.isInteger(rawRow) ? rawRow : null,
    rawColumn: Number.isInteger(rawColumn) ? rawColumn + 1 : null,
    rawColumnLetter: Number.isInteger(rawColumn) ? spreadsheetColumnName(rawColumn) : "",
    rawCell: cell,
    categoryColumn: Number.isInteger(categoryColumn) ? categoryColumn + 1 : null,
    categoryColumnLetter: Number.isInteger(categoryColumn) ? spreadsheetColumnName(categoryColumn) : "",
    profileId: profile?.id || "",
    profileVersion: profile?.version || null
  };
}

function createCanonicalProvenance(dataset, acceptedRows = []) {
  const entries = {};
  acceptedRows.forEach(row => {
    const path = canonicalPathForRow(dataset, row);
    if (!path) return;
    const key = path.join(".");
    entries[key] = {
      dataset,
      canonicalPath: key,
      canonicalCategory: row.canonicalCategory,
      year: row.year,
      gender: row.gender || "",
      skill: row.skill || "",
      value: row.value,
      mappingMethod: row.mappingMethod,
      rawCategory: row.rawCategory || "",
      source: { ...(row.provenance || row.__provenance || {}) }
    };
  });
  return { schemaVersion: 1, dataset, entries };
}

function mergeProvenanceIndexes(indexes = []) {
  const entries = {};
  const conflicts = [];
  indexes.forEach(index => {
    Object.entries(index?.entries || {}).forEach(([path, value]) => {
      if (entries[path] && JSON.stringify(entries[path]) !== JSON.stringify(value)) conflicts.push({ path, existing: entries[path], incoming: value });
      else entries[path] = value;
    });
  });
  return { schemaVersion: 1, entries, conflicts };
}

export { createCanonicalProvenance, createCellProvenance, mergeProvenanceIndexes, spreadsheetColumnName };
