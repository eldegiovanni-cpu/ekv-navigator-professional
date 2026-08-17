/* Phase B Alpha 2: fachlich getrenntes Income Feature. Runtime-Reihenfolge via build-manifest.json. */
function flowPrefix(side) {
  return side === "valid" ? "fv" : "fi";
}

function flowRoleLabel(side) {
  return side === "valid" ? "Valideneinkommen" : "Invalideneinkommen";
}

function getFlowSourceType(side) {
  return document.getElementById(flowPrefix(side) + "-source-type").value;
}

function detailListHtml(items) {
  const rows = (Array.isArray(items) ? items : []).map(item => `<li>${escapeHtml(String(item ?? ""))}</li>`);
  return `<ul class="detail-list">${rows.join("")}</ul>`;
}

function sanitizeFlowDetailHtml(rawHtml) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${String(rawHtml || "")}</div>`, "text/html");
  const items = Array.from(parsed.querySelectorAll("li"), item => item.textContent || "");
  if (items.length) return detailListHtml(items);
  return escapeHtml(parsed.body.textContent || "Noch keine Berechnung übernommen.");
}

function setFlowDetail(side, html) {
  const safeHtml = sanitizeFlowDetailHtml(html);
  APP_STATE.setFlowDetail(side, safeHtml);
  const targetId = side === "valid" ? "ekv-valid-detail" : "ekv-invalid-detail";
  document.getElementById(targetId).innerHTML = safeHtml;
}

function setFlowSelection(side, value, label, noteText, detailHtml) {
  const prefix = flowPrefix(side);
  document.getElementById(side === "valid" ? "flow-valid-final" : "flow-invalid-final").textContent = fmtMoney(value || 0);
  document.getElementById(side === "valid" ? "flow-valid-source-label" : "flow-invalid-source-label").textContent = label;
  document.getElementById(side === "valid" ? "flow-valid-note" : "flow-invalid-note").textContent = noteText;
  setFlowDetail(side, detailHtml);
  setValueAndSource(side, Number(value || 0), label);
  const statusBoxId = side === "valid" ? "flow-valid-status-box" : "flow-invalid-status-box";
  const statusBox = document.getElementById(statusBoxId);
  if (statusBox) statusBox.textContent = "Aktuelle Quelle: " + label + " | Letzte Übernahme: " + fmtMoney(Number(value || 0));
}
