/* Phase B Alpha 5: Einkommensvergleich Orchestrator. DOM Lesen und Darstellung sind ausgelagert. */
function initEkvInputs() {
  bindIncomeComparisonForm(calcEkv);
  calcEkv();
}

function calcEkv() {
  const form = readIncomeComparisonForm();
  const result = calculateEkvCase(toEkvCaseInput(form));
  const validation = validateEkvCase(toEkvValidationInput(form, result));

  renderIncomeComparison(result, validation, form);
  if (typeof updatePhase4Guidance === "function") updatePhase4Guidance();

  return { form, result, validation };
}


const INCOME_COMPARISON_FEATURE_API = Object.freeze({
  init: initEkvInputs,
  calculate: calcEkv
});
