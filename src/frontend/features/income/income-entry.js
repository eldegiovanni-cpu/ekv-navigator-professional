/* Phase B Alpha 2: fachlich getrenntes Income Feature. Runtime-Reihenfolge via build-manifest.json. */
function initEkvFlow() {
  initValidIncomeFlow();
  initInvalidIncomeFlow();
}

function resetIncomeFeatureUi() {
  ["valid", "invalid"].forEach(side => {
    setFlowDetail(side, APP_STATE.flowDetails[side]);
    refreshFlowStatModeUI(side);
    buildFlowIncomeRows(side);
    calcFlowIncome(side);
    calcFlowWage(side);
    refreshIncomePanels(side);
  });
}


const INCOME_FEATURE_API = Object.freeze({
  init: initEkvFlow,
  resetUi: resetIncomeFeatureUi,
  refreshSide: refreshIncomePanels,
  recalculateSide: recalcIncomeSide
});
