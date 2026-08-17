/**
 * Zentraler Laufzeitzustand der Anwendung.
 * Phase B migriert die bisherigen verteilten globalen Variablen in dieses Objekt.
 * Mutationen erfolgen über die expliziten Methoden oder über die stabilen Teilobjekte,
 * solange Legacy UI Module schrittweise migriert werden.
 */
function createApplicationState(initial = {}) {
  const state = {
    ekvSources: {
      validSource: initial?.ekvSources?.validSource || "Manuelle Eingabe",
      invalidSource: initial?.ekvSources?.invalidSource || "Manuelle Eingabe"
    },
    flowDetails: {
      valid: initial?.flowDetails?.valid || "Noch keine Berechnung übernommen.",
      invalid: initial?.flowDetails?.invalid || "Noch keine Berechnung übernommen."
    },
    savedPeriods: Array.isArray(initial?.savedPeriods) ? [...initial.savedPeriods] : [],
    dirty: Boolean(initial?.dirty),
    lastSaveText: String(initial?.lastSaveText || ""),
    loadedWorkspaceName: String(initial?.loadedWorkspaceName || "")
  };

  const listeners = new Set();
  const notify = (type, payload) => listeners.forEach(listener => listener(state, { type, payload }));

  const normalizeSide = side => {
    if (side !== "valid" && side !== "invalid") throw new TypeError("Income side muss valid oder invalid sein.");
    return side;
  };

  const clonePeriods = value => Array.isArray(value) ? value.map(item => ({ ...item })) : [];

  return {
    get ekvSources() { return state.ekvSources; },
    get flowDetails() { return state.flowDetails; },
    get savedPeriods() { return state.savedPeriods; },
    get dirty() { return state.dirty; },
    get lastSaveText() { return state.lastSaveText; },
    get loadedWorkspaceName() { return state.loadedWorkspaceName; },

    setIncomeSource(side, value) {
      side = normalizeSide(side);
      const key = side === "valid" ? "validSource" : "invalidSource";
      state.ekvSources[key] = String(value || "");
      notify("incomeSource", { side, value: state.ekvSources[key] });
    },
    setFlowDetail(side, value) {
      side = normalizeSide(side);
      state.flowDetails[side] = String(value || "");
      notify("flowDetail", { side, value: state.flowDetails[side] });
    },
    setSavedPeriods(value) {
      state.savedPeriods = clonePeriods(value);
      notify("savedPeriods", state.savedPeriods);
    },
    upsertSavedPeriod(period, index = -1) {
      const next = clonePeriods(state.savedPeriods);
      if (index >= 0 && index < next.length) next[index] = { ...period };
      else next.push({ ...period });
      state.savedPeriods = next;
      notify("savedPeriods", state.savedPeriods);
    },
    removeSavedPeriod(id) {
      state.savedPeriods = state.savedPeriods.filter(item => item.id !== id);
      notify("savedPeriods", state.savedPeriods);
    },
    setDirty(value) {
      state.dirty = Boolean(value);
      notify("dirty", state.dirty);
    },
    setLastSaveText(value) {
      state.lastSaveText = String(value || "");
      notify("lastSaveText", state.lastSaveText);
    },
    setLoadedWorkspaceName(value) {
      state.loadedWorkspaceName = String(value || "");
      notify("loadedWorkspaceName", state.loadedWorkspaceName);
    },
    resetIncomeState() {
      state.ekvSources.validSource = "Manuelle Eingabe";
      state.ekvSources.invalidSource = "Manuelle Eingabe";
      state.flowDetails.valid = "Noch keine Berechnung übernommen.";
      state.flowDetails.invalid = "Noch keine Berechnung übernommen.";
      notify("incomeReset", null);
    },
    snapshot() {
      return {
        ekvSources: { ...state.ekvSources },
        flowDetails: { ...state.flowDetails },
        savedPeriods: clonePeriods(state.savedPeriods),
        dirty: state.dirty,
        lastSaveText: state.lastSaveText,
        loadedWorkspaceName: state.loadedWorkspaceName
      };
    },
    reset() {
      state.ekvSources.validSource = "Manuelle Eingabe";
      state.ekvSources.invalidSource = "Manuelle Eingabe";
      state.flowDetails.valid = "Noch keine Berechnung übernommen.";
      state.flowDetails.invalid = "Noch keine Berechnung übernommen.";
      state.savedPeriods = [];
      state.dirty = false;
      state.lastSaveText = "";
      state.loadedWorkspaceName = "";
      notify("reset", null);
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("State Listener muss eine Funktion sein.");
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
