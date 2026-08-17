import { EKV_RULES } from "../rules/ekv-rules.mjs";

export function fmtMoney(value) {
  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return "";
  return "CHF " + new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
}

export function fmtNum(value, digits = 1) {
  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("de-CH", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
}

export function fmtPct(value, digits = 0) {
  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("de-CH", { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
}

export function round(value, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function effectiveLseYear(year) {
  const numericYear = Number(year);
  const bucket = EKV_RULES.lse.sourceYears.find(rule => numericYear >= rule.from && numericYear <= rule.to);
  return bucket ? bucket.sourceYear : 2024;
}

export function indexGender(gender) {
  return gender === "VE Frühinvalide" ? "Neutral" : gender;
}

export function calculateStatisticalAnnual({ monthly, hours, baseIndex, targetIndex }) {
  const m = Number(monthly), h = Number(hours), b = Number(baseIndex), t = Number(targetIndex);
  if (![m, h, b, t].every(Number.isFinite) || m <= 0 || h <= 0 || b <= 0 || t <= 0) return null;
  return (((m / EKV_RULES.lse.standardWeeklyHours * h) / b) * t) * 12;
}

export function hasCompleteStatisticalBase(base) {
  return ["monthly", "hours", "baseIndex", "targetIndex", "annual"]
    .every(key => Number.isFinite(base?.[key]) && base[key] > 0);
}

export function calculateInvalidStatisticalIncome(base, { besitzstand, restAf, leidens }) {
  const annual = Number(base?.annual);
  const year = Number(base?.year);
  const numericRestAf = restAf === null || restAf === "" || restAf === undefined ? null : Number(restAf);
  const numericLeidens = leidens === null || leidens === "" || leidens === undefined ? null : Number(leidens);
  let pauschalLabel = "Kein Pauschalabzug";
  let teilzeitLabel = "Kein Teilzeitabzug";
  let annualAfterNewLawDeductions = null;

  if (besitzstand !== "Ja" && annual && year >= EKV_RULES.invalidIncome.pauschalabzugFromYear) {
    const pauschalabzug = EKV_RULES.invalidIncome.pauschalabzug;
    const teilzeitabzug = numericRestAf !== null && numericRestAf > 0.01 && numericRestAf <= EKV_RULES.invalidIncome.teilzeitabzugMaxRestCapacity
      ? EKV_RULES.invalidIncome.teilzeitabzug : 0;
    annualAfterNewLawDeductions = annual * (1 - pauschalabzug - teilzeitabzug);
    pauschalLabel = "Pauschalabzug 10 Prozent";
    teilzeitLabel = teilzeitabzug ? "Teilzeitabzug 10 Prozent" : "Kein Teilzeitabzug";
  }

  const capacityAdjusted = annual && numericRestAf !== null ? (annualAfterNewLawDeductions ?? annual) * numericRestAf : null;
  let legacyPartTimeAdjusted = null;
  if (besitzstand !== "Ja" && year >= EKV_RULES.invalidIncome.legacyTeilzeitFromYear && year <= EKV_RULES.invalidIncome.legacyTeilzeitToYear && numericRestAf !== null && numericRestAf <= EKV_RULES.invalidIncome.teilzeitabzugMaxRestCapacity && capacityAdjusted !== null) {
    legacyPartTimeAdjusted = capacityAdjusted * (1 - EKV_RULES.invalidIncome.legacyTeilzeitabzug);
    teilzeitLabel = "Teilzeitabzug 10 Prozent";
  }

  let finalValue = capacityAdjusted;
  let deductionNote = year >= EKV_RULES.invalidIncome.pauschalabzugFromYear && besitzstand !== "Ja" ? `${pauschalLabel} | ${teilzeitLabel}` : pauschalLabel;
  if ((year < EKV_RULES.invalidIncome.pauschalabzugFromYear || besitzstand === "Ja") && numericLeidens !== null && numericLeidens > 0.01 && capacityAdjusted !== null) {
    finalValue = capacityAdjusted * (1 - numericLeidens);
    deductionNote = "Leidensbedingter Abzug " + fmtPct(numericLeidens, 0);
  } else if (legacyPartTimeAdjusted !== null) {
    finalValue = legacyPartTimeAdjusted;
    deductionNote = teilzeitLabel;
  }
  return { finalValue, pauschalLabel, teilzeitLabel, deductionNote };
}

export function calculateValidStatisticalIncome(base, parallelIncome) {
  const annual = Number(base?.annual);
  const numericParallelIncome = parallelIncome === null || parallelIncome === "" || parallelIncome === undefined ? null : Number(parallelIncome);
  let finalValue = annual;
  let parallelText = "Nicht geprüft";
  let transferNote = "Beim Valideneinkommen werden keine Abzüge berücksichtigt.";
  if (numericParallelIncome !== null && annual) {
    const threshold = annual * EKV_RULES.validIncome.parallelisationThreshold;
    if (numericParallelIncome < threshold) {
      finalValue = threshold;
      parallelText = "Parallelisierung angezeigt: " + fmtMoney(threshold);
      transferNote = "Der parallelisierte Wert wurde übernommen, weil das AHV Einkommen unter 95 Prozent des statistischen Werts liegt.";
    } else parallelText = "Nicht angezeigt";
  }
  return { finalValue, parallelText, transferNote };
}
