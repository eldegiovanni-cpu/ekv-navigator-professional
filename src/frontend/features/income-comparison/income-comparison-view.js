/* Phase B Alpha 5: reine Darstellung des Einkommensvergleichs. Keine Fachberechnung. */
function renderIncomeComparisonMetrics(result, form) {
  const { valid, invalid, loss, grade, noAcquisitionLoss, mixed } = result;

  setTextContent("ekv-valid-source", APP_STATE.ekvSources.validSource);
  setTextContent("ekv-invalid-source", APP_STATE.ekvSources.invalidSource);
  setTextContent("ekv-valid-display", fmtMoney(valid));
  setTextContent("ekv-invalid-display", fmtMoney(invalid));

  const lossElement = getElement("ekv-loss");
  if (lossElement) {
    lossElement.innerHTML = noAcquisitionLoss ? "Keine<br>Erwerbseinbusse" : fmtMoney(loss);
    lossElement.classList.toggle("no-loss-text", noAcquisitionLoss);
    lossElement.classList.toggle("negative", false);
  }
  setTextContent("ekv-grade", fmtPct(grade, 0));

  setElementHidden("mixed-ekv-panel", form.method !== "mixed");
  setElementHidden("mixed-result-grid", form.method !== "mixed");

  if (form.method === "mixed" && mixed) {
    setTextContent("ekv-weighted-employment", fmtPct(mixed.weightedEmployment, 0));
    setTextContent("ekv-weighted-household", fmtPct(mixed.weightedHousehold, 0));
    setTextContent("ekv-final-grade", fmtPct(mixed.finalGrade, 0));
    setTextContent(
      "ekv-weighted-employment-note",
      fmtPct(form.employmentSharePercent / 100, 0) + " Erwerb × " + fmtPct(grade, 0) + " Einschränkung Erwerb"
    );
    setTextContent(
      "ekv-weighted-household-note",
      fmtPct(form.householdSharePercent / 100, 0) + " Haushalt × " + fmtPct(form.householdLimitationPercent / 100, 0) + " Einschränkung Haushalt"
    );
  }
}

function renderIncomeComparisonValidation(validation) {
  const validationList = getElement("ekv-validation-list");
  if (!validationList) return;

  if (validation.issues.length) {
    validationList.className = "validation-list warn";
    validationList.innerHTML = validation.issues.map(item => `<li>${escapeHtml(item)}</li>`).join("");
    return;
  }

  validationList.className = "validation-list good";
  validationList.innerHTML = "<li>Die aktuelle Berechnung ist vollständig erfasst und plausibel dokumentiert.</li>";
}

function renderIncomeComparisonStatus(result, validation) {
  const validComplete = validation.validIncomeComplete;
  const invalidComplete = validation.invalidIncomeComplete;

  setTextContent("ekv-valid-status-source", APP_STATE.ekvSources.validSource);
  setTextContent("ekv-invalid-status-source", APP_STATE.ekvSources.invalidSource);
  setTextContent("ekv-valid-status-transfer", validComplete ? fmtMoney(result.valid) : "Noch keine Berechnung übernommen");
  setTextContent("ekv-invalid-status-transfer", invalidComplete ? fmtMoney(result.invalid) : "Noch keine Berechnung übernommen");
  setTextContent("ekv-valid-status-state", validComplete ? "Vollständig" : "Unvollständig");
  setTextContent("ekv-invalid-status-state", invalidComplete ? "Vollständig" : "Unvollständig");

  const summary = getElement("ekv-summary-box");
  if (summary) {
    summary.style.display = "none";
    summary.textContent = "";
  }

  setTextContent(
    "flow-valid-status-box",
    "Aktuelle Quelle: " + APP_STATE.ekvSources.validSource + " | Status: " + (validComplete ? "vollständig" : "noch unvollständig")
  );
  setTextContent(
    "flow-invalid-status-box",
    "Aktuelle Quelle: " + APP_STATE.ekvSources.invalidSource + " | Status: " + (invalidComplete ? "vollständig" : "noch unvollständig")
  );
}

function renderIncomeComparison(result, validation, form) {
  renderIncomeComparisonMetrics(result, form);
  renderIncomeComparisonValidation(validation);
  renderIncomeComparisonStatus(result, validation);
}
