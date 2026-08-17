/**
 * Developer Architecture 3.0 Phase B Alpha 4
 * Strukturierter, browserunabhängiger Exportvertrag.
 * Renderer erhalten ausschliesslich dieses Modell und lesen keine UI Elemente aus.
 */
export const EXPORT_DOCUMENT_SCHEMA_VERSION = 1;
export const PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION = 1;

function asText(value, fallback = "") {
  const text = value == null ? "" : String(value);
  return text.trim() || fallback;
}

function normalizeMetric(metric, fallbackSource = "") {
  const source = metric && typeof metric === "object" ? metric : {};
  return Object.freeze({
    value: asText(source.value, "Nicht erfasst"),
    source: asText(source.source, fallbackSource)
  });
}

function normalizeStatus(status) {
  const source = status && typeof status === "object" ? status : {};
  return Object.freeze({
    source: asText(source.source, "Nicht erfasst"),
    transfer: asText(source.transfer, "Nicht erfasst"),
    state: asText(source.state, "Nicht erfasst")
  });
}

export function hasStructuredExportSnapshot(period) {
  return !!period && !!period.exportSnapshot && Number(period.exportSnapshot.schemaVersion) === PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION;
}

export function normalizePeriodExportSnapshot(snapshot, period = {}) {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  const metrics = source.metrics && typeof source.metrics === "object" ? source.metrics : {};
  const details = source.details && typeof source.details === "object" ? source.details : {};
  const reasons = source.reasons && typeof source.reasons === "object" ? source.reasons : {};
  const creator = source.creator && typeof source.creator === "object" ? source.creator : {};
  const statuses = source.statuses && typeof source.statuses === "object" ? source.statuses : {};
  const validation = Array.isArray(source.validation) ? source.validation.map(value => asText(value)).filter(Boolean) : [];
  const method = source.method === "mixed" ? "mixed" : "pure";

  return Object.freeze({
    schemaVersion: PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION,
    periodId: asText(source.periodId || period.id),
    periodFrom: asText(source.periodFrom || period.periodeVon),
    periodTo: asText(source.periodTo ?? period.periodeBis),
    creator: Object.freeze({
      employeeName: asText(creator.employeeName || period.employeeName, "Nicht erfasst"),
      editDate: asText(creator.editDate || period.editDate)
    }),
    method,
    metrics: Object.freeze({
      valid: normalizeMetric(metrics.valid),
      invalid: normalizeMetric(metrics.invalid),
      loss: normalizeMetric(metrics.loss, "Valideneinkommen minus Invalideneinkommen"),
      grade: normalizeMetric(metrics.grade, "Erwerbseinbusse im Verhältnis zum Valideneinkommen"),
      weightedEmployment: method === "mixed" ? normalizeMetric(metrics.weightedEmployment) : null,
      weightedHousehold: method === "mixed" ? normalizeMetric(metrics.weightedHousehold) : null,
      finalGrade: method === "mixed" ? normalizeMetric(metrics.finalGrade, "Summe der gewichteten Einschränkungen") : null
    }),
    details: Object.freeze({
      validHtml: asText(details.validHtml, "Nicht erfasst."),
      invalidHtml: asText(details.invalidHtml, "Nicht erfasst.")
    }),
    reasons: Object.freeze({
      validText: asText(reasons.validText),
      invalidText: asText(reasons.invalidText)
    }),
    statuses: Object.freeze({
      valid: normalizeStatus(statuses.valid),
      invalid: normalizeStatus(statuses.invalid)
    }),
    validation: Object.freeze(validation),
    summaryText: asText(source.summaryText),
    legacyConverted: Boolean(source.legacyConverted)
  });
}

/**
 * Erstellt das stabile Exportdokument. Für Altbestände kann ein expliziter
 * Legacy Adapter übergeben werden. Neue Datensätze benötigen diesen nie.
 */
export function createExportDocumentModel({ workspaceName = "", periods = [], legacyAdapter = null } = {}) {
  const normalizedPeriods = (Array.isArray(periods) ? periods : []).map(period => {
    let snapshot = period?.exportSnapshot;
    if (!hasStructuredExportSnapshot(period)) {
      if (typeof legacyAdapter !== "function") {
        throw new Error("Zeitperiode besitzt noch keinen strukturierten Export Snapshot.");
      }
      snapshot = legacyAdapter(period);
    }
    return normalizePeriodExportSnapshot(snapshot, period);
  });

  return Object.freeze({
    schemaVersion: EXPORT_DOCUMENT_SCHEMA_VERSION,
    workspaceName: asText(workspaceName, "Nicht erfasst"),
    periods: Object.freeze(normalizedPeriods)
  });
}
