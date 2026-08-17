/* Phase 5: professionelle lokale Arbeitsstandsverwaltung. Browser Persistenz bleibt bewusst in dieser UI Schicht. */
function setDirtyState(isDirty, message = "") {
  APP_STATE.setDirty(!!isDirty);
  const chip = document.getElementById("ekv-save-chip");
  const status = document.getElementById("ekv-save-status");
  const workspaceChip = document.getElementById("workspace-summary-chip");
  setStatusIndicator(chip, isDirty ? "Ungespeichert" : "Gespeichert", "status-chip", isDirty ? "warn" : "good");
  setStatusIndicator(workspaceChip, isDirty ? "Ungespeichert" : "Gespeichert", "status-chip", isDirty ? "warn" : "good");
  if (status) {
    status.textContent = message || (isDirty
      ? "Es bestehen ungespeicherte Änderungen im aktuellen Arbeitsstand."
      : (APP_STATE.lastSaveText || "Noch keine ungespeicherten Änderungen."));
  }
  updateWorkspaceActiveState();
}

function markSaved(message) {
  APP_STATE.setLastSaveText(message);
  setDirtyState(false, message);
}

function markDirty(message = "") {
  setDirtyState(true, message || "Es bestehen ungespeicherte Änderungen im aktuellen Arbeitsstand.");
}

function flashElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("flash-update");
  void el.offsetWidth;
  el.classList.add("flash-update");
}


function updatePeriodCountChip() {
  const chip = document.getElementById("period-count-chip");
  if (!chip) return;
  chip.textContent = `${APP_STATE.savedPeriods.length} Zeitperioden`;
}

function getWorkspaceStatusElement() {
  return document.getElementById("workspace-status");
}

function setWorkspaceStatus(message) {
  const el = getWorkspaceStatusElement();
  if (el) el.textContent = message;
}

function getCurrentWorkspaceName() {
  return (document.getElementById("workspace-name")?.value || "").trim();
}

function hasSavedCurrentWorkspaceName() {
  const name = getCurrentWorkspaceName();
  if (!name) return false;
  const workspaces = getStoredWorkspaces();
  return !!workspaces[name];
}

function requireSavedWorkspaceNameForExport() {
  if (hasSavedCurrentWorkspaceName()) return true;
  alert("Bitte Einkommensvergleich Name speichern");
  const nameInput = document.getElementById("workspace-name");
  if (nameInput) {
    nameInput.focus();
    nameInput.classList.add("flash-update");
    setTimeout(() => nameInput.classList.remove("flash-update"), 1200);
  }
  return false;
}

function getExportWorkspaceNameHtml(className = "export-workspace-name") {
  const safeName = escapeHtml(getCurrentWorkspaceName() || "Nicht erfasst");
  return `<div class="${className}"><span>Name des Einkommensvergleich: </span><strong>${safeName}</strong></div>`;
}

