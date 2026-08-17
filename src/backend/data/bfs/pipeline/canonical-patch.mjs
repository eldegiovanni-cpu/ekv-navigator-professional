function setNested(target, path, value) {
  let node = target;
  path.slice(0, -1).forEach(key => {
    if (!node[key] || typeof node[key] !== "object" || Array.isArray(node[key])) node[key] = {};
    node = node[key];
  });
  node[path[path.length - 1]] = value;
}

function canonicalPathForRow(dataset, row) {
  switch (dataset) {
    case "BUA": return ["workHoursBranch", row.canonicalCategory, row.year];
    case "NLI": return ["indexData", row.gender, row.canonicalCategory, row.year];
    case "LSE_TA01": return ["modes", "TA01", "lseData", row.year, row.canonicalCategory, row.skill, row.gender];
    case "LSE_T17": return ["modes", "T17", "lseData", row.year, row.canonicalCategory, "Alle", row.gender];
    case "LSE_TA11": return ["modes", "TA11", "lseData", row.year, row.canonicalCategory, row.skill, row.gender];
    default: return null;
  }
}

function createCanonicalPatch(dataset, acceptedRows) {
  const patch = {};
  acceptedRows.forEach(row => {
    const path = canonicalPathForRow(dataset, row);
    if (path) setNested(patch, path, row.value);
  });
  return patch;
}

function getNested(target, path) {
  let node = target;
  for (const key of path) {
    if (!node || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, key)) return undefined;
    node = node[key];
  }
  return node;
}

function mergeCanonicalPatch(baseData, dataset, acceptedRows) {
  const merged = structuredClone(baseData);
  const applied = [];
  const equal = [];
  const conflicts = [];
  acceptedRows.forEach(row => {
    const path = canonicalPathForRow(dataset, row);
    if (!path) return;
    const existing = getNested(merged, path);
    if (existing !== undefined && existing !== null && Number(existing) !== Number(row.value)) {
      conflicts.push({ path: path.join("."), existing, incoming: row.value, sourceRow: row.sourceRow, provenance: row.provenance || row.__provenance || null });
      return;
    }
    if (existing !== undefined && existing !== null && Number(existing) === Number(row.value)) {
      equal.push({ path: path.join("."), value: row.value, sourceRow: row.sourceRow, provenance: row.provenance || row.__provenance || null });
      return;
    }
    setNested(merged, path, row.value);
    applied.push({ path: path.join("."), value: row.value, sourceRow: row.sourceRow, provenance: row.provenance || row.__provenance || null });
  });
  return { data: merged, applied, equal, conflicts };
}

export { canonicalPathForRow, createCanonicalPatch, getNested, mergeCanonicalPatch, setNested };
