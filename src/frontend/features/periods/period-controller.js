function saveCurrentPeriod() {
  hidePeriodWarning();
  const from = document.getElementById("ekv-period-from").value;
  const to = document.getElementById("ekv-period-to").value;
  if (!from) {
    showPeriodWarning("Bitte erfasse mindestens das Startdatum der Zeitperiode.");
    return;
  }
  if (to && from > to) {
    showPeriodWarning("Das Datum von darf nicht nach dem Datum bis liegen.");
    return;
  }
  const valid = Number(document.getElementById("ekv-valid").value || 0);
  const invalid = Number(document.getElementById("ekv-invalid").value || 0);
  if (!valid && !invalid) {
    showPeriodWarning("Für diese Zeitperiode liegt noch kein Einkommensvergleich vor.");
    return;
  }
  const genderMismatch = getGenderMismatchMessage();
  if (genderMismatch) {
    showPeriodWarning(genderMismatch);
    return;
  }
  const existingIndex = APP_STATE.savedPeriods.findIndex(entry => entry.periodeVon === from && entry.periodeBis === to);
  const overlap = APP_STATE.savedPeriods.some((entry, idx) => idx !== existingIndex && periodsOverlap(from, to, entry.periodeVon, entry.periodeBis));
  if (overlap) {
    showPeriodWarning("Zeitperioden überschneiden sich");
    return;
  }
  if (existingIndex >= 0 && !confirm("Zeitperiode überschreiben?")) {
    return;
  }
  const validReason = document.getElementById("ekv-valid-reason").value.trim();
  const invalidReason = document.getElementById("ekv-invalid-reason").value.trim();
  const employeeName = document.getElementById("ekv-employee-name")?.value.trim() || "";
  const editDate = document.getElementById("ekv-edit-date")?.value || "";
  const periodId = existingIndex >= 0
    ? APP_STATE.savedPeriods[existingIndex].id
    : `period-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const exportSnapshot = capturePeriodExportSnapshot({
    periodId,
    periodFrom: from,
    periodTo: to,
    validReason,
    invalidReason,
    employeeName,
    editDate
  });
  const box3Html = buildBox3HtmlForExport(validReason, invalidReason);
  const reasoningPreview = [validReason, invalidReason].filter(Boolean).join(" | ");
  const previewText = (reasoningPreview || stripHtml(document.getElementById("ekv-summary-box").textContent)).slice(0, 220);
  const formState = captureEkvFormState();
  const ekvMethod = exportSnapshot.method;
  const ivGradeDisplay = exportSnapshot.metrics.grade.value;
  const finalIvGradeDisplay = ekvMethod === "mixed" ? (exportSnapshot.metrics.finalGrade?.value || ivGradeDisplay) : ivGradeDisplay;
  const payload = {
    schemaVersion: PERIOD_SCHEMA_VERSION,
    id: periodId,
    periodeVon: from,
    periodeBis: to,
    box3Html,
    previewText,
    validReason,
    invalidReason,
    employeeName,
    editDate,
    ekvMethod,
    ivGradeDisplay,
    finalIvGradeDisplay,
    exportSnapshot,
    formState,
    createdAt: existingIndex >= 0 ? (APP_STATE.savedPeriods[existingIndex].createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  APP_STATE.upsertSavedPeriod(payload, existingIndex);
  renderSavedPeriods();
  WORKSPACE_FEATURE_API.markSaved(`Zeitperiode ${formatPeriodDisplay(from, to)} gespeichert.`);
}

function moveSavedPeriod(id, direction) {
  APP_STATE.setSavedPeriods(movePeriod(APP_STATE.savedPeriods, id, direction));
  renderSavedPeriods();
}

function loadSavedPeriodIntoFields(id) {
  const entry = APP_STATE.savedPeriods.find(item => item.id === id);
  if (!entry) return;
  const restored = restoreEkvFormState(entry.formState);
  if (!restored) {
    document.getElementById("ekv-period-from").value = entry.periodeVon || "";
    document.getElementById("ekv-period-to").value = entry.periodeBis || "";
    if (document.getElementById("ekv-employee-name")) document.getElementById("ekv-employee-name").value = entry.employeeName || "";
    if (document.getElementById("ekv-edit-date")) document.getElementById("ekv-edit-date").value = entry.editDate || "";
    if (typeof entry.validReason === "string") document.getElementById("ekv-valid-reason").value = entry.validReason;
    if (typeof entry.invalidReason === "string") document.getElementById("ekv-invalid-reason").value = entry.invalidReason;
  }
  hidePeriodWarning();
  WORKSPACE_FEATURE_API.markDirty("Gespeicherte Zeitperiode zur Bearbeitung geladen. Beim erneuten Speichern derselben Periode kann sie überschrieben werden.");
  NAVIGATION_FEATURE_API.activate("tab-ekv");
}

function deleteSavedPeriod(id) {
  const entry = APP_STATE.savedPeriods.find(item => item.id === id);
  if (!entry) return;
  if (!confirm(`Soll die Zeitperiode ${formatPeriodDisplay(entry.periodeVon, entry.periodeBis)} wirklich gelöscht werden?`)) return;
  APP_STATE.removeSavedPeriod(id);
  renderSavedPeriods();
  WORKSPACE_FEATURE_API.markDirty("Eine gespeicherte Zeitperiode wurde gelöscht.");
}

function bindSavedPeriodActions() {
  const container = document.getElementById("saved-periods-list");
  if (!container) return;
  container.addEventListener("click", event => {
    const button = event.target.closest("[data-period-action]");
    if (!button || !container.contains(button)) return;
    const id = button.dataset.periodId || "";
    const action = button.dataset.periodAction;
    if (action === "load") loadSavedPeriodIntoFields(id);
    if (action === "move") moveSavedPeriod(id, Number(button.dataset.direction || 0));
    if (action === "delete") deleteSavedPeriod(id);
  });
}


const PERIOD_FEATURE_API = Object.freeze({
  init: bindSavedPeriodActions,
  save: saveCurrentPeriod,
  render: renderSavedPeriods,
  load: loadSavedPeriodIntoFields,
  move: moveSavedPeriod,
  remove: deleteSavedPeriod,
  hideWarning: hidePeriodWarning,
  updateCount: updatePeriodCountChip
});
