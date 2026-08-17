export function isMissingFlowDetail(value) { return !value || String(value).includes("Noch keine"); }
export function validateEkvCase({ periodFrom = "", validIncome = 0, invalidIncome = 0, method = "pure", employmentSharePercent = 0, householdSharePercent = 0, householdLimitationRaw = "", validDetail = "", invalidDetail = "", validReason = "", invalidReason = "", employeeName = "", editDate = "", genderMismatchMessage = "" } = {}) {
  const issues = [];
  const valid = Number(validIncome || 0), invalid = Number(invalidIncome || 0);
  if (!periodFrom) issues.push("Das Startdatum der Zeitperiode ist noch nicht erfasst.");
  if (valid <= 0) issues.push("Das Valideneinkommen fehlt oder ist 0.");
  if (invalid < 0) issues.push("Das Invalideneinkommen ist negativ und sollte geprüft werden.");
  if (invalid > valid && valid > 0) issues.push("Spezialfall: Das Invalideneinkommen ist höher als das Valideneinkommen. Der IV Grad wird deshalb mit 0 Prozent ausgewiesen.");
  if (method === "mixed") {
    const es = Number(employmentSharePercent || 0), hs = Number(householdSharePercent || 0);
    if (Math.round((es + hs) * 10) / 10 !== 100) issues.push("Bei der gemischten Methode müssen Erwerbsbereich und Haushalt zusammen 100 Prozent ergeben.");
    if (householdLimitationRaw === "") issues.push("Die Einschränkung im Haushalt ist noch nicht erfasst.");
  }
  if (isMissingFlowDetail(validDetail)) issues.push("Für das Valideneinkommen wurde noch keine nachvollziehbare Berechnung übernommen.");
  if (isMissingFlowDetail(invalidDetail)) issues.push("Für das Invalideneinkommen wurde noch keine nachvollziehbare Berechnung übernommen.");
  if (!String(validReason).trim()) issues.push("Die Begründung für das Valideneinkommen fehlt noch.");
  if (!String(invalidReason).trim()) issues.push("Die Begründung für das Invalideneinkommen fehlt noch.");
  if (!String(employeeName).trim()) issues.push("Name Mitarbeiter/in ist noch nicht erfasst.");
  if (!editDate) issues.push("Das Bearbeitungsdatum ist noch nicht erfasst.");
  if (genderMismatchMessage) issues.push(genderMismatchMessage);
  return { complete: issues.length === 0, issues, validIncomeComplete: valid > 0 && !isMissingFlowDetail(validDetail), invalidIncomeComplete: invalid >= 0 && !isMissingFlowDetail(invalidDetail) };
}
