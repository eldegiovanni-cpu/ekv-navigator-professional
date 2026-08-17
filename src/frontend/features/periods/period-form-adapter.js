function getSelectedFlowGender(side) {
  const sourceType = document.getElementById(flowPrefix(side) + "-source-type")?.value || "";
  if (sourceType === "stat") return document.getElementById(flowPrefix(side) + "-stat-gender")?.value || "";
  if (sourceType === "income") return document.getElementById(flowPrefix(side) + "-inc-gender")?.value || "";
  return "";
}

function getGenderMismatchMessage() {
  const veGender = getSelectedFlowGender("valid");
  const iveGender = getSelectedFlowGender("invalid");
  if (veGender && iveGender && veGender !== iveGender) return "Geschlecht VE und IVE muss gleich sein";
  return "";
}

function captureIncomeRows(side) {
  const prefix = flowPrefix(side);
  return Array.from(document.querySelectorAll("#" + prefix + "-income-table tbody tr")).map(tr => ({
    year: tr.querySelector(".inc-year")?.value || "",
    amount: tr.querySelector(".inc-amount")?.value || "",
    pensum: tr.querySelector(".inc-pensum")?.value || ""
  }));
}

function restoreIncomeRows(side, rows) {
  if (!Array.isArray(rows)) return;
  const prefix = flowPrefix(side);
  updateFlowIncomeColumnVisibility(side);
  const trs = Array.from(document.querySelectorAll("#" + prefix + "-income-table tbody tr"));
  rows.forEach((row, idx) => {
    const tr = trs[idx];
    if (!tr) return;
    const yearEl = tr.querySelector(".inc-year");
    const amountEl = tr.querySelector(".inc-amount");
    const pensumEl = tr.querySelector(".inc-pensum");
    if (yearEl) yearEl.value = row.year || "";
    if (amountEl) amountEl.value = row.amount || "";
    if (pensumEl) pensumEl.value = row.pensum || "";
  });
}

function setElementValueById(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!value;
  else el.value = value ?? "";
}

function captureEkvFormState() {
  const values = {};
  document.querySelectorAll("#tab-ekv input, #tab-ekv select, #tab-ekv textarea").forEach(el => {
    if (!el.id) return;
    if (el.type === "checkbox") values[el.id] = el.checked;
    else values[el.id] = el.value;
  });
  return {
    values,
    incomeRows: {
      valid: captureIncomeRows("valid"),
      invalid: captureIncomeRows("invalid")
    },
    ekvState: { ...APP_STATE.ekvSources },
    flowDetails: { ...APP_STATE.flowDetails },
    validDetailHtml: document.getElementById("ekv-valid-detail")?.innerHTML || "",
    invalidDetailHtml: document.getElementById("ekv-invalid-detail")?.innerHTML || ""
  };
}

function restoreEkvFormState(state) {
  if (!state || !state.values) return false;

  const values = state.values || {};

  // 1. Zuerst die Berechnungsbasis zurücksetzen, damit die passenden Unterformulare sichtbar sind.
  ["fv-source-type", "fi-source-type"].forEach(id => setElementValueById(id, values[id]));
  ["valid", "invalid"].forEach(side => refreshFlowPanels(side));

  // 2. Danach LSE Quelle setzen und abhängige Dropdowns neu aufbauen.
  ["fv-stat-source", "fi-stat-source"].forEach(id => setElementValueById(id, values[id]));
  ["valid", "invalid"].forEach(side => refreshFlowStatModeUI(side));

  // 3. Jetzt alle normalen Felder setzen. Erst jetzt existieren die dynamischen Optionen sicher.
  Object.entries(values).forEach(([id, value]) => setElementValueById(id, value));

  // 4. AHV Einkommenszeilen besitzen keine fixen IDs und müssen separat wiederhergestellt werden.
  ["valid", "invalid"].forEach(side => {
    buildFlowIncomeRows(side);
    restoreIncomeRows(side, state.incomeRows?.[side]);
  });

  // 5. Nach dem Neuaufbau nochmals alle Werte setzen, damit keine Neuberechnung einen Formularwert überschreibt.
  Object.entries(values).forEach(([id, value]) => setElementValueById(id, value));
  ["valid", "invalid"].forEach(side => restoreIncomeRows(side, state.incomeRows?.[side]));

  if (state.ekvState) {
    APP_STATE.setIncomeSource("valid", state.ekvState.validSource || "");
    APP_STATE.setIncomeSource("invalid", state.ekvState.invalidSource || "");
  }
  if (state.flowDetails) {
    setFlowDetail("valid", state.flowDetails.valid || "");
    setFlowDetail("invalid", state.flowDetails.invalid || "");
  }

  ["valid", "invalid"].forEach(side => {
    refreshFlowPanels(side);
    recalcFlow(side);
  });

  if (state.validDetailHtml) setFlowDetail("valid", state.validDetailHtml);
  if (state.invalidDetailHtml) setFlowDetail("invalid", state.invalidDetailHtml);
  INCOME_COMPARISON_FEATURE_API.calculate();
  return true;
}

