/* Phase B Alpha 5: DOM Formularadapter für den Einkommensvergleich. */
const INCOME_COMPARISON_REACTIVE_FIELDS = Object.freeze([
  "ekv-valid",
  "ekv-invalid",
  "ekv-method",
  "ekv-employment-share",
  "ekv-household-share",
  "ekv-household-limitation"
]);

function bindIncomeComparisonForm(handler) {
  INCOME_COMPARISON_REACTIVE_FIELDS.forEach(id => bindReactiveField(id, handler));
}

function readIncomeComparisonForm() {
  const method = getElement("ekv-method")?.value || "pure";
  const employmentSharePercent = Number(getElement("ekv-employment-share")?.value || 0);
  const householdSharePercent = Number(getElement("ekv-household-share")?.value || 0);
  const householdLimitationRaw = getElement("ekv-household-limitation")?.value ?? "";
  const householdLimitationPercent = Number(householdLimitationRaw || 0);

  return {
    validInput: getElement("ekv-valid")?.value || "",
    invalidInput: getElement("ekv-invalid")?.value || "",
    method,
    employmentSharePercent,
    householdSharePercent,
    householdLimitationRaw,
    householdLimitationPercent,
    periodFrom: getElement("ekv-period-from")?.value || "",
    validReason: getElement("ekv-valid-reason")?.value || "",
    invalidReason: getElement("ekv-invalid-reason")?.value || "",
    employeeName: getElement("ekv-employee-name")?.value || "",
    editDate: getElement("ekv-edit-date")?.value || "",
    genderMismatchMessage: getGenderMismatchMessage()
  };
}

function toEkvCaseInput(form) {
  return {
    validIncome: form.validInput,
    invalidIncome: form.invalidInput,
    method: form.method,
    employmentShare: form.employmentSharePercent / 100,
    householdShare: form.householdSharePercent / 100,
    householdLimitation: form.householdLimitationPercent / 100
  };
}

function toEkvValidationInput(form, result) {
  return {
    periodFrom: form.periodFrom,
    validIncome: result.valid,
    invalidIncome: result.invalid,
    method: form.method,
    employmentSharePercent: form.employmentSharePercent,
    householdSharePercent: form.householdSharePercent,
    householdLimitationRaw: form.householdLimitationRaw,
    validDetail: APP_STATE.flowDetails.valid,
    invalidDetail: APP_STATE.flowDetails.invalid,
    validReason: form.validReason,
    invalidReason: form.invalidReason,
    employeeName: form.employeeName,
    editDate: form.editDate,
    genderMismatchMessage: form.genderMismatchMessage
  };
}
