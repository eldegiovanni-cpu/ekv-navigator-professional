/* Final 2.1: read only BFS Datenkontrolle und Export. Keine Datenänderung in der Oberfläche. */
const DATA_INSPECTOR_STATE = {
  pageSize: 100,
  page: 0,
  rows: [],
  filtered: []
};

const DATA_INSPECTOR_DATASETS = Object.freeze({
  ta01: { label: "LSE TA01", kind: "lse", mode: "TA01" },
  t17: { label: "LSE T17", kind: "lse", mode: "T17" },
  ta11: { label: "LSE TA11", kind: "lse", mode: "TA11" },
  index: { label: "Nominallohnindex", kind: "index" },
  hours: { label: "Betriebsübliche Arbeitszeiten", kind: "hours" }
});

function flattenLseDataset(mode) {
  const cfg = DATA?.modes?.[mode];
  const rows = [];
  Object.entries(cfg?.lseData || {}).forEach(([year, branchMap]) => {
    Object.entries(branchMap || {}).forEach(([category, skillMap]) => {
      Object.entries(skillMap || {}).forEach(([skill, genderMap]) => {
        Object.entries(genderMap || {}).forEach(([gender, value]) => {
          rows.push({ Jahr: year, Kategorie: category, Kompetenzniveau: skill, Geschlecht: gender, Wert: value });
        });
      });
    });
  });
  return rows;
}

function flattenIndexDataset() {
  const rows = [];
  Object.entries(DATA?.indexData || {}).forEach(([gender, branchMap]) => {
    Object.entries(branchMap || {}).forEach(([branch, yearMap]) => {
      Object.entries(yearMap || {}).forEach(([year, value]) => {
        rows.push({ Jahr: year, Branche: branch, Geschlecht: gender, Index: value });
      });
    });
  });
  return rows;
}

function flattenHoursDataset() {
  const rows = [];
  Object.entries(DATA?.workHoursBranch || {}).forEach(([branch, yearMap]) => {
    Object.entries(yearMap || {}).forEach(([year, value]) => {
      rows.push({ Jahr: year, Branche: branch, "Wochenstunden": value });
    });
  });
  return rows;
}

function getDataInspectorRows(datasetId) {
  const descriptor = DATA_INSPECTOR_DATASETS[datasetId] || DATA_INSPECTOR_DATASETS.ta01;
  if (descriptor.kind === "lse") return flattenLseDataset(descriptor.mode);
  if (descriptor.kind === "index") return flattenIndexDataset();
  if (descriptor.kind === "hours") return flattenHoursDataset();
  return [];
}

function getDataInspectorNativeDataset(datasetId) {
  if (datasetId === "ta01") return DATA?.modes?.TA01 || {};
  if (datasetId === "t17") return DATA?.modes?.T17 || {};
  if (datasetId === "ta11") return DATA?.modes?.TA11 || {};
  if (datasetId === "index") return DATA?.indexData || {};
  if (datasetId === "hours") return DATA?.workHoursBranch || {};
  return {};
}

function filterDataInspectorRows(rows, query) {
  const needle = normalizeBfsLabel(query);
  if (!needle) return rows.slice();
  return rows.filter(row => normalizeBfsLabel(Object.values(row).join(" ")).includes(needle));
}

function dataInspectorCsv(rows) {
  if (!rows.length) return "";
  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach(key => set.add(key));
    return set;
  }, new Set()));
  const escape = value => {
    const text = value == null ? "" : String(value);
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.join(";"), ...rows.map(row => columns.map(column => escape(row[column])).join(";"))].join("\r\n");
}

function downloadDataInspectorFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getDataInspectorDatasetId() {
  return document.getElementById("data-inspector-dataset")?.value || "ta01";
}

function updateDataInspectorIntegrity() {
  const element = document.getElementById("data-inspector-integrity");
  const chip = document.getElementById("data-inspector-integrity-chip");
  if (!element || !chip) return;
  const report = DATA_HARMONIZATION_REPORT || { mappings: [], unresolved: [], collisions: [] };
  const unresolved = report.unresolved?.length || 0;
  const collisions = report.collisions?.length || 0;
  const mapped = report.mappings?.length || 0;
  const aliasCount = Object.keys(BRANCH_ALIASES?.aliases || {}).length;
  const ok = unresolved === 0 && collisions === 0 && DATA_NAMING_AUDIT?.valid !== false;
  setStatusIndicator(chip, ok ? "Datenbasis geprüft" : "Prüfpunkte vorhanden", "status-chip", ok ? "good" : "warn");
  element.innerHTML = ok
    ? `<strong>Namensharmonisierung aktiv.</strong> ${mapped} Bezeichnungen wurden beim Start automatisch harmonisiert. ${aliasCount} explizite Aliasregeln sind hinterlegt. Keine offenen Zuordnungen.`
    : `<strong>Kontrolle erforderlich.</strong> ${unresolved} nicht zugeordnete Bezeichnungen, ${collisions} Mehrfachzuordnungen. Nicht eindeutige Werte werden bewusst nicht automatisch verwendet.`;
}

function renderDataInspector() {
  const datasetId = getDataInspectorDatasetId();
  const query = document.getElementById("data-inspector-search")?.value || "";
  DATA_INSPECTOR_STATE.rows = getDataInspectorRows(datasetId);
  DATA_INSPECTOR_STATE.filtered = filterDataInspectorRows(DATA_INSPECTOR_STATE.rows, query);
  const maxPage = Math.max(0, Math.ceil(DATA_INSPECTOR_STATE.filtered.length / DATA_INSPECTOR_STATE.pageSize) - 1);
  DATA_INSPECTOR_STATE.page = Math.min(DATA_INSPECTOR_STATE.page, maxPage);
  const start = DATA_INSPECTOR_STATE.page * DATA_INSPECTOR_STATE.pageSize;
  const pageRows = DATA_INSPECTOR_STATE.filtered.slice(start, start + DATA_INSPECTOR_STATE.pageSize);
  const table = document.getElementById("data-inspector-table");
  const meta = document.getElementById("data-inspector-meta");
  const pageMeta = document.getElementById("data-inspector-page-meta");
  const prev = document.getElementById("data-inspector-prev");
  const next = document.getElementById("data-inspector-next");
  const descriptor = DATA_INSPECTOR_DATASETS[datasetId];

  if (meta) meta.textContent = `${descriptor.label}: ${DATA_INSPECTOR_STATE.filtered.length.toLocaleString("de-CH")} von ${DATA_INSPECTOR_STATE.rows.length.toLocaleString("de-CH")} Datenzeilen`;
  if (pageMeta) pageMeta.textContent = DATA_INSPECTOR_STATE.filtered.length ? `Seite ${DATA_INSPECTOR_STATE.page + 1} von ${maxPage + 1}` : "Keine Treffer";
  if (prev) prev.disabled = DATA_INSPECTOR_STATE.page <= 0;
  if (next) next.disabled = DATA_INSPECTOR_STATE.page >= maxPage;

  if (!table) return;
  if (!pageRows.length) {
    table.innerHTML = `<tbody><tr><td>${emptyStateMarkup("Keine Daten für den gewählten Filter.", "data-inspector-empty")}</td></tr></tbody>`;
    return;
  }
  const columns = Object.keys(pageRows[0]);
  table.innerHTML = `<thead><tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${pageRows.map(row => `<tr>${columns.map(column => `<td>${escapeHtml(row[column] == null ? "" : String(row[column]))}</td>`).join("")}</tr>`).join("")}</tbody>`;
}

function exportDataInspectorCsv() {
  const datasetId = getDataInspectorDatasetId();
  const label = DATA_INSPECTOR_DATASETS[datasetId].label.replace(/\s+/g, "_");
  const rows = DATA_INSPECTOR_STATE.filtered.length || (document.getElementById("data-inspector-search")?.value || "")
    ? DATA_INSPECTOR_STATE.filtered
    : getDataInspectorRows(datasetId);
  downloadDataInspectorFile(`EKV_${label}.csv`, "\ufeff" + dataInspectorCsv(rows), "text/csv;charset=utf-8");
}

function exportDataInspectorJson() {
  const datasetId = getDataInspectorDatasetId();
  const label = DATA_INSPECTOR_DATASETS[datasetId].label.replace(/\s+/g, "_");
  downloadDataInspectorFile(`EKV_${label}.json`, JSON.stringify(getDataInspectorNativeDataset(datasetId), null, 2), "application/json;charset=utf-8");
}

function initDataInspector() {
  const dataset = document.getElementById("data-inspector-dataset");
  const search = document.getElementById("data-inspector-search");
  const prev = document.getElementById("data-inspector-prev");
  const next = document.getElementById("data-inspector-next");
  const csv = document.getElementById("data-inspector-export-csv");
  const json = document.getElementById("data-inspector-export-json");
  if (!dataset) return;

  dataset.innerHTML = Object.entries(DATA_INSPECTOR_DATASETS)
    .map(([id, item]) => `<option value="${id}">${escapeHtml(item.label)}</option>`)
    .join("");
  dataset.addEventListener("change", () => { DATA_INSPECTOR_STATE.page = 0; renderDataInspector(); });
  search?.addEventListener("input", () => { DATA_INSPECTOR_STATE.page = 0; renderDataInspector(); });
  prev?.addEventListener("click", () => { DATA_INSPECTOR_STATE.page = Math.max(0, DATA_INSPECTOR_STATE.page - 1); renderDataInspector(); });
  next?.addEventListener("click", () => { DATA_INSPECTOR_STATE.page += 1; renderDataInspector(); });
  csv?.addEventListener("click", exportDataInspectorCsv);
  json?.addEventListener("click", exportDataInspectorJson);
  updateDataInspectorIntegrity();
  renderDataInspector();
}

const DATA_INSPECTOR_FEATURE_API = Object.freeze({
  init: initDataInspector,
  render: renderDataInspector,
  exportCsv: exportDataInspectorCsv,
  exportJson: exportDataInspectorJson
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    dataInspectorCsv,
    filterDataInspectorRows,
    getDataInspectorRows
  };
}
