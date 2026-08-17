/**
 * @file Verbindliche Fachverträge für Developer Architecture 3.0.
 * Die Typdefinitionen dienen IDEs, Reviews und KI gestützter Entwicklung.
 * Sie verändern die Laufzeit nicht.
 */

/**
 * @typedef {Object} EkvCaseInput
 * @property {number|string} validIncome
 * @property {number|string} invalidIncome
 * @property {"pure"|"mixed"} method
 * @property {number} [employmentShare] Anteil 0 bis 1
 * @property {number} [householdShare] Anteil 0 bis 1
 * @property {number} [householdLimitation] Einschränkung 0 bis 1
 */

/**
 * @typedef {Object} EkvCaseResult
 * @property {number} valid
 * @property {number} invalid
 * @property {number} rawLoss
 * @property {number} loss
 * @property {number} grade
 * @property {boolean} noAcquisitionLoss
 * @property {"pure"|"mixed"} method
 * @property {Object|null} mixed
 * @property {number} finalGrade
 */

/**
 * @typedef {Object} StatisticalBaseInput
 * @property {"TA01"|"T17"|"TA11"} mode
 * @property {number|string} year
 * @property {string} gender
 * @property {string} branch
 * @property {string|number} skill
 */

/**
 * @typedef {Object} WorkspaceRuntimeState
 * @property {{validSource:string,invalidSource:string}} ekvSources
 * @property {{valid:string,invalid:string}} flowDetails
 * @property {Array<Object>} savedPeriods
 * @property {boolean} dirty
 * @property {string} lastSaveText
 * @property {string} loadedWorkspaceName
 */

export const EKV_CONTRACT_VERSION = "3.0-phase-b-alpha1";
