/* Developer Architecture 3.0 Phase C: Verträge für BFS Rohlieferungen. */

const BFS_DATASET_TYPES = Object.freeze({
  BUA: "BUA",
  NLI: "NLI",
  LSE_TA01: "LSE_TA01",
  LSE_T17: "LSE_T17",
  LSE_TA11: "LSE_TA11"
});

const BFS_DATASET_DEFINITIONS = Object.freeze({
  BUA: Object.freeze({
    label: "Betriebsübliche Wochenarbeitszeiten",
    requiredFields: Object.freeze(["branch", "year", "hours"]),
    valueField: "hours",
    categoryField: "branch",
    categoryKind: "noga"
  }),
  NLI: Object.freeze({
    label: "Nominallohnindex",
    requiredFields: Object.freeze(["gender", "branch", "year", "index"]),
    valueField: "index",
    categoryField: "branch",
    categoryKind: "noga"
  }),
  LSE_TA01: Object.freeze({
    label: "LSE TA01",
    requiredFields: Object.freeze(["year", "branch", "skill", "gender", "value"]),
    valueField: "value",
    categoryField: "branch",
    categoryKind: "noga"
  }),
  LSE_T17: Object.freeze({
    label: "LSE T17",
    requiredFields: Object.freeze(["year", "branch", "gender", "value"]),
    valueField: "value",
    categoryField: "branch",
    categoryKind: "mode-branch",
    mode: "T17"
  }),
  LSE_TA11: Object.freeze({
    label: "LSE TA11",
    requiredFields: Object.freeze(["year", "education", "skill", "gender", "value"]),
    valueField: "value",
    categoryField: "education",
    categoryKind: "mode-branch",
    mode: "TA11"
  })
});

function createBfsRawPackage({ dataset, source = {}, rows = [] } = {}) {
  return {
    schemaVersion: 1,
    dataset: String(dataset || ""),
    source: {
      title: String(source.title || ""),
      publisher: String(source.publisher || "Bundesamt für Statistik"),
      publishedAt: source.publishedAt ? String(source.publishedAt) : "",
      sourceFile: String(source.sourceFile || ""),
      sourceUrl: String(source.sourceUrl || ""),
      sheetName: String(source.sheetName || ""),
      profileId: String(source.profileId || ""),
      profileVersion: source.profileVersion === undefined || source.profileVersion === null ? null : Number(source.profileVersion)
    },
    rows: Array.isArray(rows) ? rows.map(row => ({ ...row })) : []
  };
}

function validateBfsRawPackage(pkg) {
  const issues = [];
  if (!pkg || typeof pkg !== "object") return { valid: false, issues: ["BFS Rohpaket fehlt."] };
  const definition = BFS_DATASET_DEFINITIONS[pkg.dataset];
  if (!definition) issues.push(`Unbekannter BFS Datensatztyp: ${String(pkg.dataset || "(leer)")}`);
  if (!Array.isArray(pkg.rows) || !pkg.rows.length) issues.push("BFS Rohpaket enthält keine Datenzeilen.");
  if (definition && Array.isArray(pkg.rows)) {
    pkg.rows.forEach((row, index) => {
      if (!row || typeof row !== "object") {
        issues.push(`Zeile ${index + 1}: kein gültiges Objekt.`);
        return;
      }
      definition.requiredFields.forEach(field => {
        if (row[field] === undefined || row[field] === null || String(row[field]).trim() === "") {
          issues.push(`Zeile ${index + 1}: Pflichtfeld ${field} fehlt.`);
        }
      });
    });
  }
  return { valid: issues.length === 0, issues };
}

export { BFS_DATASET_DEFINITIONS, BFS_DATASET_TYPES, createBfsRawPackage, validateBfsRawPackage };
