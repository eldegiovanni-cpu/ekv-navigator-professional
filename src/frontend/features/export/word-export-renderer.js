/* RC1.3: Word Renderer mit derselben fachlichen Hierarchie wie der PDF Export. */
const WORD_COLORS = Object.freeze({
  line: "#d8dee9", text: "#17212b", muted: "#5c6b7a", blue: "#f5fbff",
  good: "#eef8f1", goodLine: "#b8dec4", warn: "#fff4e9", warnLine: "#f1cfab"
});

function wordStyle(value) { return exportEscapeHtml(value); }

function renderWordMetricCell(label, metric, tone = "") {
  const bg = tone === "good" ? WORD_COLORS.good : tone === "warn" ? WORD_COLORS.warn : tone === "primary" ? WORD_COLORS.blue : "#ffffff";
  return `<td style="width:50%;vertical-align:top;border:1px solid ${WORD_COLORS.line};background:${bg};padding:7pt 8pt;">
    <div style="font-size:8pt;font-weight:700;color:${WORD_COLORS.muted};margin-bottom:3pt;">${exportEscapeHtml(label)}</div>
    <div style="font-size:13pt;font-weight:700;line-height:1.15;color:${WORD_COLORS.text};">${exportEscapeHtml(metric?.value || "Nicht erfasst")}</div>
    <div style="font-size:8pt;color:${WORD_COLORS.muted};margin-top:3pt;">${exportEscapeHtml(metric?.source || "")}</div>
  </td>`;
}

function renderWordTraceBlock(title, contentHtml, tone = "good") {
  const border = tone === "warn" ? WORD_COLORS.warnLine : WORD_COLORS.goodLine;
  const bg = tone === "warn" ? "#fffaf3" : "#f6fcf8";
  return `<div style="border:1px solid ${border};background:${bg};padding:7pt 8pt;margin:0 0 7pt 0;page-break-inside:auto;break-inside:auto;">
    <div style="font-size:9.5pt;font-weight:700;margin:0 0 4pt 0;page-break-after:avoid;break-after:avoid;">${exportEscapeHtml(title)}</div>
    <div style="font-size:9pt;line-height:1.3;">${contentHtml}</div>
  </div>`;
}

function renderWordReasonBlock(title, reasonText, tone = "good") {
  return renderWordTraceBlock(title, exportReasonHtml(reasonText), tone);
}

function renderWordCreatorTable(period, workspaceName, index) {
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 8pt 0;page-break-inside:avoid;break-inside:avoid;">
    <tr><td colspan="4" style="border-bottom:1px solid ${WORD_COLORS.line};padding:0 0 5pt 0;font-size:14pt;font-weight:700;">Einkommensvergleich</td></tr>
    <tr><td colspan="4" style="padding:4pt 0 2pt 0;font-size:10.5pt;font-weight:700;">${index + 1}. Zeitperiode: ${exportEscapeHtml(exportFormatPeriod(period.periodFrom, period.periodTo))}</td></tr>
    <tr><td style="width:20%;padding:2pt 5pt 2pt 0;font-size:8pt;font-weight:700;color:${WORD_COLORS.muted};">Name des Einkommensvergleich</td><td style="width:30%;padding:2pt 6pt;font-size:9pt;">${exportEscapeHtml(workspaceName)}</td><td style="width:20%;padding:2pt 5pt;font-size:8pt;font-weight:700;color:${WORD_COLORS.muted};">Bearbeitungsdatum</td><td style="width:30%;padding:2pt 0 2pt 6pt;font-size:9pt;">${exportEscapeHtml(exportFormatDate(period.creator?.editDate) || "Nicht erfasst")}</td></tr>
    <tr><td style="padding:2pt 5pt 2pt 0;font-size:8pt;font-weight:700;color:${WORD_COLORS.muted};">Name Mitarbeiter/in</td><td style="padding:2pt 6pt;font-size:9pt;">${exportEscapeHtml(period.creator?.employeeName || "Nicht erfasst")}</td><td style="padding:2pt 5pt;font-size:8pt;font-weight:700;color:${WORD_COLORS.muted};">Berechnungsart</td><td style="padding:2pt 0 2pt 6pt;font-size:9pt;">${period.method === "mixed" ? "Gemischter Einkommensvergleich" : "Reiner Einkommensvergleich"}</td></tr>
  </table>`;
}

function renderWordSummary(period) {
  const metrics = period.metrics;
  const mixed = period.method === "mixed";
  const mixedRows = mixed ? `<table style="width:100%;border-collapse:separate;border-spacing:4pt;margin:0 0 8pt 0;table-layout:fixed;page-break-inside:avoid;break-inside:avoid;"><tr>
    ${renderWordMetricCell("Gewichtete Einschränkung Erwerb", metrics.weightedEmployment)}
    ${renderWordMetricCell("Gewichtete Einschränkung Haushalt", metrics.weightedHousehold)}
  </tr><tr><td colspan="2" style="border:1px solid ${WORD_COLORS.line};background:${WORD_COLORS.blue};padding:7pt 8pt;"><div style="font-size:8pt;font-weight:700;color:${WORD_COLORS.muted};margin-bottom:3pt;">Finaler IV Grad gemischte Methode</div><div style="font-size:13pt;font-weight:700;">${exportEscapeHtml(metrics.finalGrade?.value || "Nicht erfasst")}</div><div style="font-size:8pt;color:${WORD_COLORS.muted};margin-top:3pt;">${exportEscapeHtml(metrics.finalGrade?.source || "Summe der gewichteten Einschränkungen")}</div></td></tr></table>` : "";
  return `<table style="width:100%;border-collapse:separate;border-spacing:4pt;margin:0 0 4pt 0;table-layout:fixed;page-break-inside:avoid;break-inside:avoid;">
    <tr>${renderWordMetricCell("Valideneinkommen", metrics.valid, "good")}${renderWordMetricCell("Invalideneinkommen", metrics.invalid, "warn")}</tr>
    <tr>${renderWordMetricCell("Erwerbseinbusse", metrics.loss)}${renderWordMetricCell("IV Grad Erwerbsbereich", metrics.grade, "primary")}</tr>
  </table>${mixedRows}`;
}

function renderWordPeriod(period, workspaceName, index) {
  const pageBreak = index ? `<div style="page-break-before:always;break-before:page;height:0;line-height:0;font-size:0;"></div>` : "";
  return `${pageBreak}<section style="width:100%;font-family:Arial,Helvetica,sans-serif;color:${WORD_COLORS.text};font-size:9pt;line-height:1.3;">
    ${renderWordCreatorTable(period, workspaceName, index)}
    ${renderWordSummary(period)}
    ${renderWordTraceBlock("Nachvollziehbarkeit Valideneinkommen", sanitizeExportDetailHtml(period.details.validHtml), "good")}
    ${renderWordReasonBlock("Begründung Valideneinkommen", period.reasons.validText, "good")}
    ${renderWordTraceBlock("Nachvollziehbarkeit Invalideneinkommen", sanitizeExportDetailHtml(period.details.invalidHtml), "warn")}
    ${renderWordReasonBlock("Begründung Invalideneinkommen", period.reasons.invalidText, "warn")}
  </section>`;
}

function renderWordClipboardFragment(model) {
  const blocks = model.periods.map((period, index) => renderWordPeriod(period, model.workspaceName, index)).join("");
  return `<div data-ekv-word-export="1" style="width:100%;font-family:Arial,Helvetica,sans-serif;color:${WORD_COLORS.text};font-size:9pt;line-height:1.3;background:#ffffff;">${blocks}</div>`;
}

function renderWordExportDocument(model, title = "EKV Zeitperioden Word Export") {
  return `<!DOCTYPE html><html lang="de" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head>
    <meta charset="utf-8"><meta name="ProgId" content="Word.Document"><meta name="Generator" content="EKV Navigator Professional"><title>${exportEscapeHtml(title)}</title>
    <style>@page{size:A4 portrait;margin:12mm 12mm 12mm 12mm;} body{margin:0;padding:0;background:#fff;} p{margin:0 0 3pt 0;} ul.detail-list{margin:0;padding-left:14pt;} ul.detail-list li{margin:0 0 2pt 0;} table{mso-table-lspace:0pt;mso-table-rspace:0pt;} </style>
  </head><body>${renderWordClipboardFragment(model)}</body></html>`;
}
