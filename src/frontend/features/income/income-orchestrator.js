/* Phase B Alpha 2: Income Feature Orchestrator. Keine Berechnungslogik in dieser Datei. */
function refreshIncomePanels(side) {
  const prefix = flowPrefix(side);
  const sourceType = getFlowSourceType(side);
  ["stat","income","wage","direct"].forEach(type => {
    document.getElementById(prefix + "-panel-" + type).classList.toggle("hide", !sourceType || type !== sourceType);
  });
  if (!sourceType) {
    resetFlowOutput(side);
    INCOME_COMPARISON_FEATURE_API.calculate();
    return;
  }
  recalcIncomeSide(side);
}

function recalcIncomeSide(side) {
  const sourceType = getFlowSourceType(side);
  if (sourceType === "stat") calcFlowStat(side);
  if (sourceType === "income") calcFlowIncome(side);
  if (sourceType === "wage") calcFlowWage(side);
  if (sourceType === "direct") calcFlowDirect(side);
}

function initIncomeSide(side) {
  const prefix = flowPrefix(side);
  document.getElementById(prefix + "-source-type").addEventListener("change", () => refreshIncomePanels(side));
  initStatisticalIncome(side);
  initAhvIncome(side);
  initWageCalculator(side);
  initDirectIncome(side);
  refreshIncomePanels(side);
}

// Übergangskompatibilität für Perioden- und Controller-Module bis zu deren vollständiger ESM-Migration.
const refreshFlowPanels = refreshIncomePanels;
const recalcFlow = recalcIncomeSide;
