function exportEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportFormatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return String(dateStr);
  return `${d}.${m}.${y}`;
}

function exportFormatPeriod(from, to) {
  const fromText = exportFormatDate(from);
  const toText = exportFormatDate(to);
  if (fromText && toText) return `${fromText} bis ${toText}`;
  if (fromText) return `ab ${fromText}`;
  return "Zeitperiode nicht erfasst";
}

function exportReasonHtml(value) {
  return exportEscapeHtml(String(value || "")).replace(/\r?\n/g, "<br>") || "Keine Begründung erfasst.";
}

function sanitizeExportDetailHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div class="export-detail-root">${html || ""}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "Nicht erfasst.";
  root.querySelectorAll("button, input, textarea, select, script, style").forEach(el => el.remove());
  root.querySelectorAll(".trace-title").forEach(el => el.remove());
  root.querySelectorAll("ul").forEach(ul => {
    ul.style.margin = "0";
    ul.style.paddingLeft = "12pt";
  });
  root.querySelectorAll("li").forEach(li => { li.style.margin = "0 0 1pt 0"; });
  return (root.innerHTML || "").trim() || "Nicht erfasst.";
}

function exportCreatorMetaHtml(period) {
  const name = exportEscapeHtml(period.creator?.employeeName || "Nicht erfasst");
  const date = exportEscapeHtml(exportFormatDate(period.creator?.editDate || "") || "Nicht erfasst");
  return `<div class="creator-meta"><div><span class="creator-label">Name Mitarbeiter/in</span><span class="creator-value">${name}</span></div><div><span class="creator-label">Bearbeitungsdatum</span><span class="creator-value">${date}</span></div></div>`;
}
