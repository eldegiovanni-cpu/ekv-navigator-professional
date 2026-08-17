import { round } from "./calculations.mjs";

export function calculateIncomeRow({ amount, kind = "full", pensum = null, sourceIndex = null, targetIndex = null }) {
  const numericAmount = amount === "" || amount === null || amount === undefined ? null : Number(amount);
  const numericPensum = pensum === "" || pensum === null || pensum === undefined ? null : Number(pensum);
  const numericSourceIndex = Number(sourceIndex), numericTargetIndex = Number(targetIndex);
  const validPensum = kind === "full" || (Number.isFinite(numericPensum) && numericPensum > 0 && numericPensum <= 100);
  const fullAmount = Number.isFinite(numericAmount) && validPensum ? (kind === "partial" ? numericAmount / numericPensum * 100 : numericAmount) : null;
  const uprated = Number.isFinite(fullAmount) && numericSourceIndex > 0 && numericTargetIndex > 0 ? fullAmount / numericSourceIndex * numericTargetIndex : null;
  return { amount: numericAmount, pensum: numericPensum, validPensum, fullAmount, sourceIndex: numericSourceIndex > 0 ? numericSourceIndex : null, targetIndex: numericTargetIndex > 0 ? numericTargetIndex : null, uprated, complete: Number.isFinite(uprated) && uprated > 0 };
}

export function calculateIncomeAverage(rows) {
  const values = (Array.isArray(rows) ? rows : []).map(row => row?.uprated).filter(value => Number.isFinite(value) && value > 0);
  return { average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, count: values.length };
}

export function calculateWageResults({ hourly = 0, weeklyHours = 0, seasonHourly = 0, annualHours = 0, daily = 0, daysWeek = 0, weekly = 0 } = {}) {
  return { standard: Number(hourly || 0) * Number(weeklyHours || 0) * 52, season: Number(seasonHourly || 0) * Number(annualHours || 0), day: Number(daily || 0) * Number(daysWeek || 0) * 52, week: Number(weekly || 0) * 52 };
}

export const WAGE_RESULT_LABELS = Object.freeze({ standard: "Stundenlohnrechner Standard", season: "Stundenlohnrechner Saisonalbetrieb", day: "Stundenlohnrechner Taglohn", week: "Stundenlohnrechner Wochenlohn" });

export function selectWageResult(results, key) {
  const label = WAGE_RESULT_LABELS[key];
  if (!label) return { value: 0, label: "Noch kein Wert ausgewählt" };
  return { value: Number(results?.[key] || 0), label };
}

export function calculateDirectIncome({ income = 0, kind = "full", pensum = 0, indexEnabled = false, sourceIndex = null, targetIndex = null } = {}) {
  const numericIncome = Number(income || 0), numericPensum = Number(pensum || 0), numericSourceIndex = Number(sourceIndex), numericTargetIndex = Number(targetIndex);
  const validPensum = kind !== "partial" || numericPensum > 0;
  const baseValue = kind === "partial" ? (numericIncome > 0 && validPensum ? numericIncome / numericPensum * 100 : 0) : numericIncome;
  const validIndices = !indexEnabled || (numericSourceIndex > 0 && numericTargetIndex > 0);
  const finalValue = indexEnabled ? (baseValue > 0 && validIndices ? baseValue / numericSourceIndex * numericTargetIndex : 0) : baseValue;
  return { income: numericIncome, pensum: numericPensum, validPensum, baseValue, sourceIndex: numericSourceIndex > 0 ? numericSourceIndex : null, targetIndex: numericTargetIndex > 0 ? numericTargetIndex : null, validIndices, finalValue, complete: numericIncome > 0 && validPensum && validIndices };
}

export function calculateEkvComparison(validIncome, invalidIncome) {
  const valid = Number(validIncome || 0), invalid = Number(invalidIncome || 0);
  const noAcquisitionLoss = valid > 0 && invalid > valid;
  const rawLoss = valid > 0 ? valid - invalid : 0;
  const loss = noAcquisitionLoss ? 0 : rawLoss;
  const grade = valid > 0 ? round(loss / valid, 2) : 0;
  return { valid, invalid, rawLoss, loss, grade, noAcquisitionLoss };
}

export function calculateMixedMethod({ employmentGrade = 0, employmentShare = 0, householdShare = 0, householdLimitation = 0 } = {}) {
  const weightedEmployment = Number(employmentShare || 0) * Number(employmentGrade || 0);
  const weightedHousehold = Number(householdShare || 0) * Number(householdLimitation || 0);
  return { weightedEmployment, weightedHousehold, finalGrade: weightedEmployment + weightedHousehold };
}
