/* Phase B Alpha 4: UI -> strukturiertes Export Snapshot. Keine HTML Ergebnisbox wird zurückgelesen. */
function capturePeriodExportSnapshot({
  periodId = "",
  periodFrom = "",
  periodTo = "",
  validReason = "",
  invalidReason = "",
  employeeName = "",
  editDate = ""
} = {}) {
  const validInput = document.getElementById("ekv-valid")?.value || 0;
  const invalidInput = document.getElementById("ekv-invalid")?.value || 0;
  const method = document.getElementById("ekv-method")?.value || "pure";
  const employmentSharePercent = Number(document.getElementById("ekv-employment-share")?.value || 0);
  const householdSharePercent = Number(document.getElementById("ekv-household-share")?.value || 0);
  const householdLimitationRaw = document.getElementById("ekv-household-limitation")?.value ?? "";
  const householdLimitationPercent = Number(householdLimitationRaw || 0);

  const result = calculateEkvCase({
    validIncome: validInput,
    invalidIncome: invalidInput,
    method,
    employmentShare: employmentSharePercent / 100,
    householdShare: householdSharePercent / 100,
    householdLimitation: householdLimitationPercent / 100
  });

  const validation = validateEkvCase({
    periodFrom,
    validIncome: result.valid,
    invalidIncome: result.invalid,
    method,
    employmentSharePercent,
    householdSharePercent,
    householdLimitationRaw,
    validDetail: APP_STATE.flowDetails.valid,
    invalidDetail: APP_STATE.flowDetails.invalid,
    validReason,
    invalidReason,
    employeeName,
    editDate,
    genderMismatchMessage: getGenderMismatchMessage()
  });

  const validComplete = validation.validIncomeComplete;
  const invalidComplete = validation.invalidIncomeComplete;
  const weightedEmploymentSource = method === "mixed"
    ? `${fmtPct(employmentSharePercent / 100, 0)} Erwerb × ${fmtPct(result.grade, 0)} Einschränkung Erwerb`
    : "";
  const weightedHouseholdSource = method === "mixed"
    ? `${fmtPct(householdSharePercent / 100, 0)} Haushalt × ${fmtPct(householdLimitationPercent / 100, 0)} Einschränkung Haushalt`
    : "";

  return {
    schemaVersion: PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION,
    periodId,
    periodFrom,
    periodTo,
    creator: { employeeName, editDate },
    method,
    metrics: {
      valid: { value: fmtMoney(result.valid), source: APP_STATE.ekvSources.validSource },
      invalid: { value: fmtMoney(result.invalid), source: APP_STATE.ekvSources.invalidSource },
      loss: {
        value: result.noAcquisitionLoss ? "Keine Erwerbseinbusse" : fmtMoney(result.loss),
        source: "Valideneinkommen minus Invalideneinkommen"
      },
      grade: {
        value: fmtPct(result.grade, 0),
        source: "Erwerbseinbusse im Verhältnis zum Valideneinkommen"
      },
      weightedEmployment: method === "mixed" && result.mixed
        ? { value: fmtPct(result.mixed.weightedEmployment, 0), source: weightedEmploymentSource }
        : null,
      weightedHousehold: method === "mixed" && result.mixed
        ? { value: fmtPct(result.mixed.weightedHousehold, 0), source: weightedHouseholdSource }
        : null,
      finalGrade: method === "mixed" && result.mixed
        ? { value: fmtPct(result.mixed.finalGrade, 0), source: "Summe der gewichteten Einschränkungen" }
        : null
    },
    details: {
      validHtml: APP_STATE.flowDetails.valid || "Nicht erfasst.",
      invalidHtml: APP_STATE.flowDetails.invalid || "Nicht erfasst."
    },
    reasons: { validText: validReason, invalidText: invalidReason },
    statuses: {
      valid: {
        source: APP_STATE.ekvSources.validSource,
        transfer: validComplete ? fmtMoney(result.valid) : "Noch keine Berechnung übernommen",
        state: validComplete ? "Vollständig" : "Unvollständig"
      },
      invalid: {
        source: APP_STATE.ekvSources.invalidSource,
        transfer: invalidComplete ? fmtMoney(result.invalid) : "Noch keine Berechnung übernommen",
        state: invalidComplete ? "Vollständig" : "Unvollständig"
      }
    },
    validation: validation.issues || [],
    summaryText: ""
  };
}
