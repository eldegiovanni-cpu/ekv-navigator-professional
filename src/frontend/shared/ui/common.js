/* Extracted from certified EKV 2.1 reference. Runtime order managed by scripts/build.py. */
function resetFlowOutput(side) {
  const isValid = side === "valid";
  const sourceLabel = "Noch keine Berechnung übernommen";
  const input = document.getElementById(isValid ? "ekv-valid" : "ekv-invalid");
  const inputSource = document.getElementById(isValid ? "ekv-valid-source" : "ekv-invalid-source");
  if (input) input.value = "";
  if (inputSource) inputSource.textContent = sourceLabel;
  APP_STATE.setIncomeSource(side, sourceLabel);
  document.getElementById(side === "valid" ? "flow-valid-final" : "flow-invalid-final").textContent = "CHF 0.00";
  document.getElementById(side === "valid" ? "flow-valid-source-label" : "flow-invalid-source-label").textContent = "";
  document.getElementById(side === "valid" ? "flow-valid-note" : "flow-invalid-note").textContent = "Noch keine Berechnung übernommen.";
  const statusBox = document.getElementById(side === "valid" ? "flow-valid-status-box" : "flow-invalid-status-box");
  if (statusBox) statusBox.textContent = "Aktuelle Quelle: Noch keine Berechnung übernommen.";
  setFlowDetail(side, "Noch keine Berechnung übernommen.");
  INCOME_COMPARISON_FEATURE_API.calculate();
}

function resetAllCalculationFields() {
  document.querySelectorAll('#tab-ekv input, #tab-ekv select, #tab-ekv textarea').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const type = (el.type || "").toLowerCase();
    if (["button", "submit", "reset", "hidden"].includes(type)) return;
    if (tag === "select") {
      const hasEmptyOption = Array.from(el.options).some(option => option.value === "");
      if (hasEmptyOption) el.value = "";
      else el.selectedIndex = 0;
    } else if (type === "checkbox" || type === "radio") {
      el.checked = false;
    } else {
      el.value = "";
    }
  });
}


function setValueAndSource(target, value, sourceLabel) {
  const num = Number(value || 0);
  const inputId = target === "valid" ? "ekv-valid" : "ekv-invalid";
  const sourceId = target === "valid" ? "ekv-valid-source" : "ekv-invalid-source";
  document.getElementById(inputId).value = num ? round(num, 2) : 0;
  document.getElementById(sourceId).textContent = sourceLabel;
  APP_STATE.setIncomeSource(target, sourceLabel);
  INCOME_COMPARISON_FEATURE_API.calculate();
  flashElement(target === "valid" ? "ekv-valid-status-card" : "ekv-invalid-status-card");
  WORKSPACE_FEATURE_API.markDirty();
  NAVIGATION_FEATURE_API.activate("tab-ekv");
}
