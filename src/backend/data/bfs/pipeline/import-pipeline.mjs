import { BFS_DATASET_DEFINITIONS, validateBfsRawPackage } from "./contracts.mjs";
import { resolveDatasetCategory } from "./category-resolver.mjs";
import { normalizeBfsRawRow } from "./normalizers.mjs";
import { createCanonicalPatch, mergeCanonicalPatch } from "./canonical-patch.mjs";
import { createCanonicalProvenance } from "../provenance/provenance.mjs";

function importBfsRawPackage({ pkg, currentData, aliases = { aliases: {} } }) {
  const packageValidation = validateBfsRawPackage(pkg);
  if (!packageValidation.valid) {
    return {
      status: "invalid",
      packageValidation,
      normalizedRows: [], acceptedRows: [], unresolved: [], invalidRows: [], collisions: [],
      canonicalPatch: {}, provenance: { schemaVersion: 1, dataset: pkg?.dataset || "", entries: {} }, merge: { data: structuredClone(currentData || {}), applied: [], equal: [], conflicts: [] }
    };
  }

  const definition = BFS_DATASET_DEFINITIONS[pkg.dataset];
  const normalizedRows = [];
  const acceptedRows = [];
  const unresolved = [];
  const invalidRows = [];
  const collisions = [];
  const seenPaths = new Map();
  const mappingCounts = { exact: 0, alias: 0, normalized: 0, "noga-code": 0, "category-code": 0, other: 0 };

  pkg.rows.forEach((rawRow, index) => {
    const row = normalizeBfsRawRow(rawRow, definition);
    row.sourceRow = row.__provenance?.rawRow || index + 1;
    normalizedRows.push(row);
    const numeric = row[definition.valueField];
    if (!row.year || !Number.isFinite(numeric)) {
      invalidRows.push({ sourceRow: row.sourceRow, reason: "Ungültiges Jahr oder Zahlenfeld.", row });
      return;
    }
    const rawCategory = row[definition.categoryField];
    const resolved = resolveDatasetCategory({ data: currentData, aliases, definition, rawLabel: rawCategory });
    if (resolved.status !== "matched") {
      unresolved.push({ sourceRow: row.sourceRow, raw: rawCategory, method: resolved.method, provenance: row.__provenance || null });
      return;
    }
    mappingCounts[resolved.method] = (mappingCounts[resolved.method] ?? mappingCounts.other) + 1;
    const accepted = {
      ...row,
      canonicalCategory: resolved.canonical,
      mappingMethod: resolved.method,
      value: numeric,
      rawCategory: rawCategory,
      provenance: { ...(row.__provenance || {}), mappingMethod: resolved.method }
    };
    const key = [pkg.dataset, accepted.year, accepted.canonicalCategory, accepted.gender || "", accepted.skill || ""].join("|");
    if (seenPaths.has(key)) {
      const previous = seenPaths.get(key);
      if (Number(previous.value) !== Number(accepted.value)) {
        collisions.push({ key, sourceRows: [previous.sourceRow, accepted.sourceRow], values: [previous.value, accepted.value] });
        return;
      }
    } else {
      seenPaths.set(key, accepted);
      acceptedRows.push(accepted);
    }
  });

  const canonicalPatch = createCanonicalPatch(pkg.dataset, acceptedRows);
  const provenance = createCanonicalProvenance(pkg.dataset, acceptedRows);
  const merge = mergeCanonicalPatch(currentData, pkg.dataset, acceptedRows);
  const reviewRequired = unresolved.length || invalidRows.length || collisions.length || merge.conflicts.length;
  const audit = {
    schemaVersion: 1,
    dataset: pkg.dataset,
    source: { ...pkg.source },
    rawRows: pkg.rows.length,
    normalizedRows: normalizedRows.length,
    acceptedRows: acceptedRows.length,
    mappingCounts,
    unresolvedCount: unresolved.length,
    invalidRowCount: invalidRows.length,
    collisionCount: collisions.length,
    existingValueConflictCount: merge.conflicts.length,
    unchangedExistingCount: merge.equal.length,
    newValueCount: merge.applied.length,
    provenanceCount: Object.keys(provenance.entries).length,
    profileId: pkg.source?.profileId || "",
    profileVersion: pkg.source?.profileVersion || null,
    sheetName: pkg.source?.sheetName || "",
    status: reviewRequired ? "review" : "ready"
  };
  return { status: audit.status, packageValidation, normalizedRows, acceptedRows, unresolved, invalidRows, collisions, canonicalPatch, provenance, merge, audit };
}

export { importBfsRawPackage };
