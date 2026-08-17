/* Phase B Alpha 4: isolierte Kompatibilität für Zeitperioden aus älteren Arbeitsständen. */
function parseLegacyExportHtml(html) {
  const parser = new DOMParser();
  return parser.parseFromString(`<div class="legacy-export-root">${html || ""}</div>`, "text/html");
}

function legacyMetric(html, labelTexts) {
  const labels = (Array.isArray(labelTexts) ? labelTexts : [labelTexts]).map(value => String(value || "").trim());
  const doc = parseLegacyExportHtml(html);
  const metric = Array.from(doc.querySelectorAll(".metric")).find(node => labels.includes((node.querySelector(".k")?.textContent || "").trim()));
  return {
    value: (metric?.querySelector(".v")?.textContent || "Nicht erfasst").trim(),
    source: (metric?.querySelector(".s")?.textContent || "").trim()
  };
}

function legacyTraceHtml(html, titleText) {
  const doc = parseLegacyExportHtml(html);
  const box = Array.from(doc.querySelectorAll(".trace-box"))
    .find(node => ((node.querySelector(".trace-title")?.textContent || "").trim() === titleText));
  if (!box) return "Nicht erfasst.";
  const clone = box.cloneNode(true);
  clone.querySelector(".trace-title")?.remove();
  return (clone.innerHTML || "Nicht erfasst.").trim() || "Nicht erfasst.";
}

function legacyPeriodToExportSnapshot(entry) {
  const html = entry?.box3Html || "";
  const finalGrade = legacyMetric(html, "Finaler IV Grad gemischte Methode");
  const weightedEmployment = legacyMetric(html, "Gewichtete Einschränkung Erwerb");
  const weightedHousehold = legacyMetric(html, "Gewichtete Einschränkung Haushalt");
  const inferredMixed = finalGrade.value !== "Nicht erfasst" || weightedEmployment.value !== "Nicht erfasst" || weightedHousehold.value !== "Nicht erfasst";
  const method = entry?.ekvMethod === "mixed" || inferredMixed ? "mixed" : "pure";

  return {
    schemaVersion: PERIOD_EXPORT_SNAPSHOT_SCHEMA_VERSION,
    periodId: entry?.id || "",
    periodFrom: entry?.periodeVon || "",
    periodTo: entry?.periodeBis || "",
    creator: {
      employeeName: entry?.employeeName || "",
      editDate: entry?.editDate || ""
    },
    method,
    metrics: {
      valid: legacyMetric(html, "Valideneinkommen"),
      invalid: legacyMetric(html, "Invalideneinkommen"),
      loss: legacyMetric(html, "Erwerbseinbusse"),
      grade: legacyMetric(html, ["IV Grad", "IV Grad Erwerbsbereich"]),
      weightedEmployment: method === "mixed" ? weightedEmployment : null,
      weightedHousehold: method === "mixed" ? weightedHousehold : null,
      finalGrade: method === "mixed" ? finalGrade : null
    },
    details: {
      validHtml: legacyTraceHtml(html, "Nachvollziehbarkeit Valideneinkommen"),
      invalidHtml: legacyTraceHtml(html, "Nachvollziehbarkeit Invalideneinkommen")
    },
    reasons: {
      validText: entry?.validReason || "",
      invalidText: entry?.invalidReason || ""
    },
    statuses: {},
    validation: [],
    summaryText: "",
    legacyConverted: true
  };
}
