/**
 * Verbindliche fachliche Regeln des EKV Navigators.
 * Keine DOM, Storage oder UI Abhängigkeiten.
 */
export const EKV_RULES = Object.freeze({
  lse: Object.freeze({
    sourceYears: Object.freeze([
      Object.freeze({ from: 2018, to: 2019, sourceYear: 2018 }),
      Object.freeze({ from: 2020, to: 2021, sourceYear: 2020 }),
      Object.freeze({ from: 2022, to: 2023, sourceYear: 2022 }),
      Object.freeze({ from: 2024, to: Number.POSITIVE_INFINITY, sourceYear: 2024 })
    ]),
    standardWeeklyHours: 40,
    totalIndexBranch: "05-96 Total"
  }),
  validIncome: Object.freeze({
    parallelisationThreshold: 0.95
  }),
  invalidIncome: Object.freeze({
    pauschalabzugFromYear: 2024,
    pauschalabzug: 0.10,
    teilzeitabzugFromYear: 2024,
    teilzeitabzug: 0.10,
    teilzeitabzugMaxRestCapacity: 0.50,
    legacyTeilzeitFromYear: 2022,
    legacyTeilzeitToYear: 2023,
    legacyTeilzeitabzug: 0.10
  }),
  workspace: Object.freeze({
    oldAfterDays: 30
  })
});
