/* Phase B Alpha 4: PDF Renderer aus strukturiertem Exportmodell. */
function renderPdfMetric(label, metric, className = "") {
  return `<div class="metric ${className}"><div class="k">${exportEscapeHtml(label)}</div><div class="v">${exportEscapeHtml(metric?.value || "Nicht erfasst")}</div><div class="s">${exportEscapeHtml(metric?.source || "")}</div></div>`;
}

function renderPdfPeriod(period, workspaceName, index) {
  const metrics = period.metrics;
  const mixed = period.method === "mixed";
  const mixedHtml = mixed ? `
    <div class="results">
      ${renderPdfMetric("Gewichtete Einschränkung Erwerb", metrics.weightedEmployment)}
      ${renderPdfMetric("Gewichtete Einschränkung Haushalt", metrics.weightedHousehold)}
      ${renderPdfMetric("Finaler IV Grad gemischte Methode", metrics.finalGrade, "primary")}
    </div>` : "";

  return `<section class="pdf-page"><div class="pdf-page-inner">
    <div class="pdf-page-header">
      <div class="pdf-page-title">Einkommensvergleich</div>
      <div class="pdf-workspace-name"><span>Name des Einkommensvergleich: </span><strong>${exportEscapeHtml(workspaceName)}</strong></div>
      <div class="pdf-page-period">${index + 1}. Zeitperiode: ${exportEscapeHtml(exportFormatPeriod(period.periodFrom, period.periodTo))}</div>
      ${exportCreatorMetaHtml(period)}
    </div>
    <div class="card summary-card">
      <div class="results">
        ${renderPdfMetric("Valideneinkommen", metrics.valid, "good-highlight")}
        ${renderPdfMetric("Invalideneinkommen", metrics.invalid, "warn-highlight")}
      </div>
      <div class="results">
        ${renderPdfMetric("Erwerbseinbusse", metrics.loss)}
        ${renderPdfMetric("IV Grad Erwerbsbereich", metrics.grade, "primary")}
      </div>
      ${mixedHtml}
      <div class="trace-box"><div class="trace-title">Nachvollziehbarkeit Valideneinkommen</div><div>${sanitizeExportDetailHtml(period.details.validHtml)}</div></div>
      <div class="trace-box"><div class="trace-title">Begründung Valideneinkommen</div><div>${exportReasonHtml(period.reasons.validText)}</div></div>
      <div class="trace-box trace-warn"><div class="trace-title">Nachvollziehbarkeit Invalideneinkommen</div><div>${sanitizeExportDetailHtml(period.details.invalidHtml)}</div></div>
      <div class="trace-box trace-warn"><div class="trace-title">Begründung Invalideneinkommen</div><div>${exportReasonHtml(period.reasons.invalidText)}</div></div>
    </div>
  </div></section>`;
}

function renderPdfExportDocument(model, title = "EKV Zeitperioden PDF Export") {
  const blocks = model.periods.map((period, index) => renderPdfPeriod(period, model.workspaceName, index)).join("");
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${exportEscapeHtml(title)}</title><style>
    @page { size:A4 portrait; margin:8mm; }
    * { box-sizing:border-box; }
    html,body { margin:0; padding:0; background:#fff; font-family:Arial,Helvetica,sans-serif; color:#17212b; font-size:11px; line-height:1.25; }
    .pdf-page { width:100%; min-height:calc(297mm - 16mm); page-break-after:always; break-after:page; }
    .pdf-page:last-child { page-break-after:auto; break-after:auto; }
    .pdf-page-inner { width:100%; min-height:calc(297mm - 16mm); display:flex; flex-direction:column; }
    .pdf-page-header { margin-bottom:6mm; padding-bottom:2mm; border-bottom:1px solid #d8dee9; }
    .pdf-page-title { font-size:16px; font-weight:700; margin-bottom:1mm; }
    .pdf-workspace-name { font-size:9px; color:#5c6b7a; margin-bottom:1.5mm; }
    .pdf-workspace-name span,.pdf-workspace-name strong { font-size:9px; color:#5c6b7a; }
    .pdf-page-period { font-size:12px; font-weight:700; }
    .creator-meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; margin-top:3mm; font-size:9px; }
    .creator-meta>div { border:1px solid #d8dee9; border-radius:6px; padding:4px; background:#fafbfd; }
    .creator-label { display:block; color:#5c6b7a; font-size:8px; font-weight:700; margin-bottom:1px; }
    .creator-value { display:block; font-weight:700; }
    .card.summary-card { border:1px solid #d8dee9; border-radius:8px; padding:8px; box-shadow:none; width:100%; }
    .results { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-bottom:6px; }
    .results:has(.metric:nth-child(3)) { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .metric { border:1px solid #d8dee9; border-radius:8px; padding:7px; background:#fff; min-height:0; overflow:hidden; }
    .metric .k { font-size:10px; color:#5c6b7a; margin-bottom:4px; }
    .metric .v { font-size:16px; font-weight:700; line-height:1.15; white-space:normal; overflow-wrap:anywhere; }
    .metric .s { font-size:9px; color:#5c6b7a; margin-top:4px; }
    .good-highlight { background:#eef8f1; } .warn-highlight { background:#fff4e9; } .primary { background:#f5fbff; }
    .trace-box { border:1px solid #b8dec4; background:#f6fcf8; border-radius:8px; padding:5px 6px; margin:4px 0; font-size:9px; line-height:1.15; page-break-inside:avoid; break-inside:avoid; }
    .trace-warn { border-color:#f1cfab; background:#fffaf3; } .trace-title { font-size:10px; font-weight:700; margin-bottom:2px; }
    ul.detail-list { list-style:none; margin:0; padding:0; } ul.detail-list li { margin:1px 0; }
  </style></head><body>${blocks}</body></html>`;
}
