import { calculateEkvComparison, calculateMixedMethod } from "./income-calculations.mjs";
export function calculateEkvCase({ validIncome = 0, invalidIncome = 0, method = "pure", employmentShare = 0, householdShare = 0, householdLimitation = 0 } = {}) {
  const comparison = calculateEkvComparison(validIncome, invalidIncome);
  const mixed = method === "mixed" ? calculateMixedMethod({ employmentGrade: comparison.grade, employmentShare: Number(employmentShare || 0), householdShare: Number(householdShare || 0), householdLimitation: Number(householdLimitation || 0) }) : null;
  return { ...comparison, method, mixed, finalGrade: mixed ? mixed.finalGrade : comparison.grade };
}
