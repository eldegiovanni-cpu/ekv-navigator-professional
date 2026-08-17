/* Extracted from certified EKV 2.1 reference. Runtime order managed by scripts/build.py. */
function getPeriodWarningElement() {
  return document.getElementById("ekv-period-warning");
}

function showPeriodWarning(message) {
  const el = getPeriodWarningElement();
  el.textContent = message;
  el.classList.remove("hide");
}

function hidePeriodWarning() {
  getPeriodWarningElement().classList.add("hide");
  getPeriodWarningElement().textContent = "";
}

function formatReasonHtml(value) {
  const escaped = escapeHtml(value).replace(/\n/g, "<br>");
  return escaped || "Keine Begründung erfasst.";
}

function buildCreatorMetaHtml(name, date) {
  const safeName = escapeHtml(name || "Nicht erfasst");
  const safeDate = escapeHtml(formatDateDisplay(date || "") || "Nicht erfasst");
  return `
    <div class="creator-meta">
      <div><span class="creator-label">Name Mitarbeiter/in</span><span class="creator-value">${safeName}</span></div>
      <div><span class="creator-label">Bearbeitungsdatum</span><span class="creator-value">${safeDate}</span></div>
    </div>
  `;
}

function buildBox3HtmlForExport(validReasonValue = null, invalidReasonValue = null) {
  const validDisplay = document.getElementById("ekv-valid-display").textContent;
  const validSource = document.getElementById("ekv-valid-source").textContent;
  const invalidDisplay = document.getElementById("ekv-invalid-display").textContent;
  const invalidSource = document.getElementById("ekv-invalid-source").textContent;
  const validDetail = document.getElementById("ekv-valid-detail").innerHTML;
  const invalidDetail = document.getElementById("ekv-invalid-detail").innerHTML;
  const validReason = validReasonValue ?? document.getElementById("ekv-valid-reason").value;
  const invalidReason = invalidReasonValue ?? document.getElementById("ekv-invalid-reason").value;
  const loss = document.getElementById("ekv-loss").textContent;
  const grade = document.getElementById("ekv-grade").textContent;
  const summaryText = document.getElementById("ekv-summary-box").textContent;
  const method = document.getElementById("ekv-method")?.value || "pure";
  const mixedHtml = method === "mixed" ? `
      <div class="results">
        <div class="metric"><div class="k">Gewichtete Einschränkung Erwerb</div><div class="v">${document.getElementById("ekv-weighted-employment")?.textContent || "0"}</div><div class="s">${document.getElementById("ekv-weighted-employment-note")?.textContent || ""}</div></div>
        <div class="metric"><div class="k">Gewichtete Einschränkung Haushalt</div><div class="v">${document.getElementById("ekv-weighted-household")?.textContent || "0"}</div><div class="s">${document.getElementById("ekv-weighted-household-note")?.textContent || ""}</div></div>
        <div class="metric primary"><div class="k">Finaler IV Grad gemischte Methode</div><div class="v">${document.getElementById("ekv-final-grade")?.textContent || "0"}</div><div class="s">Summe der gewichteten Einschränkungen</div></div>
      </div>` : "";

  return `
    <div class="card summary-card" style="box-shadow:none">
      <div class="results">
        <div class="metric good-highlight"><div class="k">Valideneinkommen</div><div class="v">${validDisplay}</div><div class="s">${validSource}</div></div>
        <div class="metric warn-highlight"><div class="k">Invalideneinkommen</div><div class="v">${invalidDisplay}</div><div class="s">${invalidSource}</div></div>
      </div>
      <div class="results">
        <div class="metric"><div class="k">Erwerbseinbusse</div><div class="v">${loss}</div><div class="s">Valideneinkommen minus Invalideneinkommen</div></div>
        <div class="metric primary"><div class="k">IV Grad Erwerbsbereich</div><div class="v">${grade}</div><div class="s">Erwerbseinbusse im Verhältnis zum Valideneinkommen</div></div>
      </div>
      ${mixedHtml}
      <div class="trace-box">
        <div class="trace-title">Nachvollziehbarkeit Valideneinkommen</div>
        <div>${validDetail}</div>
      </div>
      <div class="trace-box">
        <div class="trace-title">Begründung Valideneinkommen</div>
        <div>${formatReasonHtml(validReason)}</div>
      </div>
      <div class="trace-box trace-warn">
        <div class="trace-title">Nachvollziehbarkeit Invalideneinkommen</div>
        <div>${invalidDetail}</div>
      </div>
      <div class="trace-box trace-warn">
        <div class="trace-title">Begründung Invalideneinkommen</div>
        <div>${formatReasonHtml(invalidReason)}</div>
      </div>
      <div class="callout good">${summaryText}</div>
    </div>
  `;
}

function getPeriodSearchTerm() {
  return (document.getElementById("period-search")?.value || "").trim().toLocaleLowerCase("de-CH");
}

function renderSavedPeriods() {
  const container = document.getElementById("saved-periods-list");
  const meta = document.getElementById("period-filter-meta");
  updatePeriodCountChip();
  if (!APP_STATE.savedPeriods.length) {
    container.innerHTML = emptyStateMarkup("Noch keine Zeitperioden gespeichert.", "period-empty");
    if (meta) meta.textContent = "Noch keine Zeitperioden gespeichert.";
    return;
  }
  const term = getPeriodSearchTerm();
  const filtered = term ? APP_STATE.savedPeriods.filter(entry => {
    const hay = [
      formatDateDisplay(entry.periodeVon),
      formatDateDisplay(entry.periodeBis),
      formatPeriodDisplay(entry.periodeVon, entry.periodeBis),
      entry.previewText || "",
      entry.validReason || "",
      entry.invalidReason || "",
      stripHtml(entry.box3Html || "")
    ].join(" ").toLocaleLowerCase("de-CH");
    return hay.includes(term);
  }) : APP_STATE.savedPeriods;

  if (meta) {
    meta.textContent = term
      ? `${filtered.length} von ${APP_STATE.savedPeriods.length} Zeitperioden angezeigt.`
      : `${APP_STATE.savedPeriods.length} Zeitperioden gespeichert.`;
  }

  container.innerHTML = filtered.map((entry) => {
    const index = APP_STATE.savedPeriods.findIndex(item => item.id === entry.id);
    const gradeMatch = (entry.box3Html || "").match(/IV Grad(?: Erwerbsbereich)?<\/div><div class="v">([^<]+)/);
    const finalGradeMatch = (entry.box3Html || "").match(/Finaler IV Grad gemischte Methode<\/div><div class="v">([^<]+)/);
    const validMatch = (entry.box3Html || "").match(/Valideneinkommen<\/div><div class="v">([^<]+)/);
    const invalidMatch = (entry.box3Html || "").match(/Invalideneinkommen<\/div><div class="v">([^<]+)/);
    const method = entry.ekvMethod || entry.formState?.values?.["ekv-method"] || (finalGradeMatch ? "mixed" : "pure");
    const gradeDisplay = entry.finalIvGradeDisplay || (method === "mixed" ? finalGradeMatch?.[1] : gradeMatch?.[1]) || gradeMatch?.[1] || "n/a";
    const gradeLabel = method === "mixed" ? "Finaler IV Grad" : "IV Grad";
    return `
      <details class="period-card">
        <summary class="period-card-header" style="cursor:pointer;list-style:none">
          <div>
            <div class="period-card-title">${index + 1}. ${formatPeriodDisplay(entry.periodeVon, entry.periodeBis)}</div>
            <div class="period-card-preview">${escapeHtml(entry.previewText || "Gespeicherter Einkommensvergleich")}</div>
          </div>
          <div class="compact-actions">
            ${statusIndicatorMarkup(`${gradeLabel} ${String(gradeDisplay).trim()}`, "status-chip", "neutral")}
          </div>
        </summary>
        <div class="period-meta-grid">
          ${labeledValueMarkup("Valideneinkommen", (validMatch?.[1] || "n/a").trim())}
          ${labeledValueMarkup("Invalideneinkommen", (invalidMatch?.[1] || "n/a").trim())}
          ${labeledValueMarkup("Mitarbeiter/in", entry.employeeName || "n/a")}
          ${labeledValueMarkup("Bearbeitungsdatum", formatDateDisplay(entry.editDate || "") || "n/a")}
          ${labeledValueMarkup("Zuletzt gespeichert", formatDateDisplay((entry.createdAt || "").slice(0,10)) || "n/a")}
        </div>
        <div class="btn-row compact-actions" style="margin-top:10px">
          <button class="btn-soft" type="button" data-period-action="load" data-period-id="${escapeHtml(entry.id)}">Bearbeiten</button>
          <button class="btn-soft" type="button" data-period-action="move" data-period-id="${escapeHtml(entry.id)}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>Nach oben</button>
          <button class="btn-soft" type="button" data-period-action="move" data-period-id="${escapeHtml(entry.id)}" data-direction="1" ${index === APP_STATE.savedPeriods.length - 1 ? 'disabled' : ''}>Nach unten</button>
          <button class="btn-warn" type="button" data-period-action="delete" data-period-id="${escapeHtml(entry.id)}">Löschen</button>
        </div>
      </details>
    `;
  }).join("");
}


