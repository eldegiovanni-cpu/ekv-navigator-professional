/* Phase B Alpha 7: gemeinsame, darstellungsneutrale UI Bausteine. */
function setStatusIndicator(targetOrId, label, baseClass = "status-chip", toneClass = "neutral") {
  const element = typeof targetOrId === "string" ? document.getElementById(targetOrId) : targetOrId;
  if (!element) return null;
  element.textContent = label;
  element.className = [baseClass, toneClass].filter(Boolean).join(" ");
  return element;
}

function statusIndicatorMarkup(label, baseClass = "status-chip", toneClass = "neutral") {
  return `<span class="${escapeHtml(baseClass)} ${escapeHtml(toneClass)}">${escapeHtml(label)}</span>`;
}

function emptyStateMarkup(message, className = "empty-state") {
  return `<div class="${escapeHtml(className)}">${escapeHtml(message)}</div>`;
}

function labeledValueMarkup(label, value, className = "period-meta-box") {
  return `<div class="${escapeHtml(className)}"><span class="label">${escapeHtml(label)}</span>${escapeHtml(value)}</div>`;
}
