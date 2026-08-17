/* Phase B Alpha 5: gemeinsame, DOM-unabhängige Präsentationsformatierung. */
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return String(dateStr);
  return `${d}.${m}.${y}`;
}

function formatPeriodDisplay(from, to) {
  const fromText = formatDateDisplay(from);
  const toText = formatDateDisplay(to);
  if (fromText && toText) return `${fromText} bis ${toText}`;
  if (fromText && !toText) return `ab ${fromText}`;
  return "Zeitperiode nicht erfasst";
}
