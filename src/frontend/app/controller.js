/* Phase B Alpha 2: Application Orchestrator. Keine Fachberechnung in dieser Datei. */
function resetCurrentCalculation() {
  if (APP_STATE.dirty && !confirm("Im aktuellen Arbeitsstand bestehen ungespeicherte Änderungen. Soll die Berechnung trotzdem zurückgesetzt werden?")) return;
  WORKSPACE_FEATURE_API.resetLoadedContext();
  resetAllCalculationFields();
  document.getElementById("ekv-valid").value = "";
  document.getElementById("ekv-invalid").value = "";
  document.getElementById("ekv-valid-reason").value = "";
  document.getElementById("ekv-invalid-reason").value = "";

  const employeeName = document.getElementById("ekv-employee-name");
  const editDate = document.getElementById("ekv-edit-date");
  if (employeeName) employeeName.value = "";
  if (editDate) editDate.value = "";

  APP_STATE.resetIncomeState();
  document.getElementById("ekv-valid-source").textContent = APP_STATE.ekvSources.validSource;
  document.getElementById("ekv-invalid-source").textContent = APP_STATE.ekvSources.invalidSource;

  INCOME_FEATURE_API.resetUi();
  PERIOD_FEATURE_API.hideWarning();

  INCOME_COMPARISON_FEATURE_API.calculate();
  WORKSPACE_FEATURE_API.markDirty();
}

function bindAppActions() {
  const bind = (id, eventName, handler) => {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventName, handler);
  };

  bind("export-pdf-btn", "click", EXPORT_FEATURE_API.pdf);
  bind("copy-word-btn", "click", EXPORT_FEATURE_API.wordClipboard);
  bind("save-period-btn", "click", PERIOD_FEATURE_API.save);
  bind("save-workspace-btn", "click", WORKSPACE_FEATURE_API.save);
  bind("load-workspace-btn", "click", WORKSPACE_FEATURE_API.load);
  bind("delete-workspace-btn", "click", WORKSPACE_FEATURE_API.remove);
  bind("load-old-workspace-btn", "click", WORKSPACE_FEATURE_API.loadOld);
  bind("delete-old-workspace-btn", "click", WORKSPACE_FEATURE_API.removeOld);
  bind("reset-ekv-btn", "click", resetCurrentCalculation);
  bind("period-search", "input", PERIOD_FEATURE_API.render);
}

function initApplication() {
  NAVIGATION_FEATURE_API.init();
  syncYearArraysFromData();
  INCOME_COMPARISON_FEATURE_API.init();
  bindAppActions();
  PERIOD_FEATURE_API.init();
  PERIOD_FEATURE_API.render();
  WORKSPACE_FEATURE_API.init();
  PERIOD_FEATURE_API.updateCount();
  NAVIGATION_FEATURE_API.activate("tab-ekv");

  document.getElementById("ekv-valid").addEventListener("input", () => {
    APP_STATE.setIncomeSource("valid", "Manuelle Eingabe");
    document.getElementById("ekv-valid-source").textContent = "Manuelle Eingabe";
    INCOME_COMPARISON_FEATURE_API.calculate();
    WORKSPACE_FEATURE_API.markDirty();
  });
  document.getElementById("ekv-invalid").addEventListener("input", () => {
    APP_STATE.setIncomeSource("invalid", "Manuelle Eingabe");
    document.getElementById("ekv-invalid-source").textContent = "Manuelle Eingabe";
    INCOME_COMPARISON_FEATURE_API.calculate();
    WORKSPACE_FEATURE_API.markDirty();
  });

  document.querySelectorAll("input, select, textarea").forEach(element => {
    if (element.closest("#data-inspector")) return;
    if (["button", "submit", "reset"].includes((element.type || "").toLowerCase())) return;
    element.addEventListener("change", () => WORKSPACE_FEATURE_API.markDirty());
  });

  const validReason = document.getElementById("ekv-valid-reason");
  const invalidReason = document.getElementById("ekv-invalid-reason");
  if (validReason) validReason.addEventListener("input", () => {
    INCOME_COMPARISON_FEATURE_API.calculate();
    WORKSPACE_FEATURE_API.markDirty();
  });
  if (invalidReason) invalidReason.addEventListener("input", () => {
    INCOME_COMPARISON_FEATURE_API.calculate();
    WORKSPACE_FEATURE_API.markDirty();
  });

  ["ekv-employee-name", "ekv-edit-date", "ekv-period-from", "ekv-period-to"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("input", () => {
      INCOME_COMPARISON_FEATURE_API.calculate();
      WORKSPACE_FEATURE_API.markDirty();
    });
  });

  WORKSPACE_FEATURE_API.markSaved("Tool bereit.");
  GUIDANCE_FEATURE_API.init();
  DATA_INSPECTOR_FEATURE_API.init();
}

const APPLICATION_FEATURE_API = Object.freeze({
  init: initApplication,
  reset: resetCurrentCalculation
});
