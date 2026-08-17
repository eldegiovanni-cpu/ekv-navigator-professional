/* Workspace Workflow Controller. Persistenz, Darstellung und Snapshot-Erzeugung sind ausgelagert. */
function readWorkspaceStore() {
  try {
    return WORKSPACE_REPOSITORY.readStore();
  } catch (error) {
    console.warn("Zwischenspeicher konnte nicht gelesen werden.", error);
    setWorkspaceStatus("Gespeicherte Arbeitsstände konnten nicht gelesen werden.");
    return { schemaVersion: WORKSPACE_STORE_SCHEMA_VERSION, updatedAt: null, workspaces: {} };
  }
}

function getStoredWorkspaces() {
  return readWorkspaceStore().workspaces;
}

function saveWorkspaceToRepository(name, snapshot) {
  try {
    WORKSPACE_REPOSITORY.save(name, snapshot);
    return true;
  } catch (error) {
    console.warn("Zwischenspeicher konnte nicht geschrieben werden.", error);
    setWorkspaceStatus("Arbeitsstand konnte im Browser nicht gespeichert werden.");
    return false;
  }
}

function removeWorkspaceFromRepository(name) {
  try {
    WORKSPACE_REPOSITORY.remove(name);
    return true;
  } catch (error) {
    console.warn("Arbeitsstand konnte nicht gelöscht werden.", error);
    setWorkspaceStatus("Arbeitsstand konnte im Browser nicht gelöscht werden.");
    return false;
  }
}

function confirmUnsavedWorkspaceTransition(targetName = "") {
  if (!APP_STATE.dirty) return true;
  const currentLabel = APP_STATE.loadedWorkspaceName || getCurrentWorkspaceName() || "aktuellen Arbeitsstand";
  const targetLabel = targetName ? ` „${targetName}“` : "";
  return confirm(`Im Arbeitsstand „${currentLabel}“ bestehen ungespeicherte Änderungen. Soll trotzdem zu${targetLabel} gewechselt werden?`);
}

function saveWorkspace() {
  const nameInput = document.getElementById("workspace-name");
  const name = (nameInput?.value || "").trim();
  if (!name) {
    setWorkspaceStatus("Bitte gib dem Einkommensvergleich zuerst eine Bezeichnung.");
    if (nameInput) nameInput.focus();
    return;
  }

  const workspaces = getStoredWorkspaces();
  if (workspaces[name] && APP_STATE.loadedWorkspaceName !== name) {
    if (!confirm(`Ein Arbeitsstand mit der Bezeichnung „${name}“ besteht bereits. Soll er überschrieben werden?`)) return;
  }

  if (!saveWorkspaceToRepository(name, collectWorkspaceSnapshot())) return;
  APP_STATE.setLoadedWorkspaceName(name);
  renderWorkspaceOptions(name, "current");
  setWorkspaceStatus(`Arbeitsstand „${name}“ wurde gespeichert. Die 30 Tage Frist beginnt mit diesem Speicherdatum neu.`);
  markSaved(`Arbeitsstand „${name}“ gespeichert.`);
}

function applyWorkspaceSnapshot(snapshot) {
  let migratedSnapshot;
  try {
    migratedSnapshot = migrateWorkspaceSnapshot(snapshot).snapshot;
  } catch (error) {
    console.warn("Arbeitsstand konnte nicht migriert werden.", error);
    setWorkspaceStatus(error.message || "Arbeitsstand konnte nicht migriert werden.");
    return false;
  }

  APP_STATE.setSavedPeriods(migratedSnapshot.savedPeriods);
  PERIOD_FEATURE_API.render();

  if (!restoreEkvFormState(migratedSnapshot.currentFormState)) {
    setWorkspaceStatus("Der Arbeitsstand enthält keinen wiederherstellbaren Formularzustand.");
    return false;
  }

  INCOME_COMPARISON_FEATURE_API.calculate();
  NAVIGATION_FEATURE_API.activate("tab-ekv");
  return true;
}

function loadWorkspaceByName(name, isOldList = false) {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    setWorkspaceStatus(isOldList
      ? "Bitte wähle einen Arbeitsstand aus der Kontrollliste aus."
      : "Bitte wähle einen aktuellen gespeicherten Einkommensvergleich aus.");
    return;
  }
  if (APP_STATE.loadedWorkspaceName !== normalizedName && !confirmUnsavedWorkspaceTransition(normalizedName)) return;

  const workspaces = getStoredWorkspaces();
  const snapshot = workspaces[normalizedName];
  if (!snapshot) {
    setWorkspaceStatus("Der gewählte Einkommensvergleich konnte nicht geladen werden.");
    renderWorkspaceOptions();
    return;
  }

  const nameInput = document.getElementById("workspace-name");
  if (nameInput) nameInput.value = normalizedName;
  if (!applyWorkspaceSnapshot(snapshot)) return;
  APP_STATE.setLoadedWorkspaceName(normalizedName);
  markSaved(`Arbeitsstand „${normalizedName}“ geladen.`);
  renderWorkspaceOptions(normalizedName, isOldList ? "old" : "current");
  setWorkspaceStatus(isOldList
    ? `Arbeitsstand „${normalizedName}“ wurde aus der Kontrollliste geladen. Bitte prüfen und danach neu speichern oder löschen.`
    : `Arbeitsstand „${normalizedName}“ wurde geladen.`);
}

function loadWorkspaceFromSelect(selectId, isOldList = false) {
  const select = document.getElementById(selectId);
  loadWorkspaceByName(select?.value || "", isOldList);
}

function loadWorkspace() {
  loadWorkspaceFromSelect("workspace-select", false);
}

function loadOldWorkspace() {
  loadWorkspaceFromSelect("workspace-old-select", true);
}

function deleteWorkspaceByName(name, isOldList = false) {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    setWorkspaceStatus(isOldList
      ? "Bitte wähle einen Arbeitsstand aus der Kontrollliste zum Löschen aus."
      : "Bitte wähle einen aktuellen Arbeitsstand zum Löschen aus.");
    return;
  }
  const workspaces = getStoredWorkspaces();
  if (!workspaces[normalizedName]) {
    setWorkspaceStatus("Der gewählte Einkommensvergleich ist nicht mehr vorhanden.");
    renderWorkspaceOptions();
    return;
  }
  if (!confirm(`Soll der Arbeitsstand „${normalizedName}“ wirklich gelöscht werden?`)) return;
  if (!removeWorkspaceFromRepository(normalizedName)) return;

  const wasLoadedWorkspace = APP_STATE.loadedWorkspaceName === normalizedName;
  if (wasLoadedWorkspace) {
    APP_STATE.setLoadedWorkspaceName("");
    markDirty(`Arbeitsstand „${normalizedName}“ wurde gelöscht. Der aktuell geöffnete Inhalt ist nicht mehr gespeichert.`);
  }
  renderWorkspaceOptions();
  setWorkspaceStatus(`Arbeitsstand „${normalizedName}“ wurde gelöscht.`);
}

function deleteWorkspaceFromSelect(selectId, isOldList = false) {
  const select = document.getElementById(selectId);
  deleteWorkspaceByName(select?.value || "", isOldList);
}

function deleteWorkspace() {
  deleteWorkspaceFromSelect("workspace-select", false);
}

function deleteOldWorkspace() {
  deleteWorkspaceFromSelect("workspace-old-select", true);
}

function resetLoadedWorkspaceContext() {
  APP_STATE.setLoadedWorkspaceName("");
  const nameInput = document.getElementById("workspace-name");
  if (nameInput) nameInput.value = "";
  updateWorkspaceActiveState();
}

function initWorkspaceFeature() {
  const workspaceSearchInput = document.getElementById("workspace-search");
  if (workspaceSearchInput) {
    workspaceSearchInput.addEventListener("input", () => renderWorkspaceOptions());
  }

  const workspaceCurrentSelect = document.getElementById("workspace-select");
  const workspaceOldSelect = document.getElementById("workspace-old-select");
  if (workspaceCurrentSelect && workspaceOldSelect) {
    workspaceCurrentSelect.addEventListener("change", () => {
      if (workspaceCurrentSelect.value) workspaceOldSelect.value = "";
    });
    workspaceOldSelect.addEventListener("change", () => {
      if (workspaceOldSelect.value) workspaceCurrentSelect.value = "";
    });
  }

  const workspaceManager = document.getElementById("workspace-manager");
  if (workspaceManager) {
    workspaceManager.addEventListener("click", event => {
      const button = event.target.closest(".phase5-workspace-action");
      if (!button) return;
      const name = button.dataset.name || "";
      const isOld = button.dataset.old === "1";
      if (button.dataset.action === "load") loadWorkspaceByName(name, isOld);
      if (button.dataset.action === "delete") deleteWorkspaceByName(name, isOld);
    });
  }

  const workspaceNameInput = document.getElementById("workspace-name");
  if (workspaceNameInput) workspaceNameInput.addEventListener("input", updateWorkspaceActiveState);
  renderWorkspaceOptions();
}

const WORKSPACE_FEATURE_API = Object.freeze({
  init: initWorkspaceFeature,
  save: saveWorkspace,
  load: loadWorkspace,
  loadOld: loadOldWorkspace,
  remove: deleteWorkspace,
  removeOld: deleteOldWorkspace,
  render: renderWorkspaceOptions,
  resetLoadedContext: resetLoadedWorkspaceContext,
  markDirty,
  markSaved,
  requireSavedNameForExport: requireSavedWorkspaceNameForExport,
  currentName: getCurrentWorkspaceName
});
