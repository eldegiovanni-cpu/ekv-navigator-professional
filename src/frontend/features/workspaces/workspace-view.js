function getWorkspaceSearchTerm() {
  return (document.getElementById("workspace-search")?.value || "").trim();
}

function formatWorkspaceSavedDate(snapshot, includeTime = false) {
  const timestamp = getWorkspaceSavedTimestamp(snapshot);
  if (!timestamp) return "Speicherdatum unbekannt";
  return new Intl.DateTimeFormat("de-CH", includeTime ? {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  } : {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(timestamp));
}

function formatWorkspacePeriod(summary = {}) {
  const from = summary.periodFrom || "";
  const to = summary.periodTo || "";
  if (!from) return "Zeitraum noch offen";
  const formatDate = value => {
    if (!value) return "offen";
    const [year, month, day] = String(value).split("-");
    return year && month && day ? `${day}.${month}.${year}` : value;
  };
  return `${formatDate(from)} bis ${to ? formatDate(to) : "auf Weiteres"}`;
}

function workspaceOptionLabel(name, snapshot, oldList) {
  const ageDays = getWorkspaceAgeDays(snapshot);
  const ageText = Number.isFinite(ageDays)
    ? `${ageDays} ${ageDays === 1 ? "Tag" : "Tage"}`
    : "Alter unbekannt";
  return oldList
    ? `${name} · gespeichert ${formatWorkspaceSavedDate(snapshot)} · ${ageText}`
    : `${name} · gespeichert ${formatWorkspaceSavedDate(snapshot)}`;
}

function buildWorkspaceOptions(entries, oldList) {
  return '<option value="">Bitte auswählen</option>' + entries.map(([name, snapshot]) =>
    `<option value="${escapeHtml(name)}">${escapeHtml(workspaceOptionLabel(name, snapshot, oldList))}</option>`
  ).join("");
}

function updateOldWorkspaceOverview(oldCount) {
  const indicator = document.getElementById("workspace-age-indicator");
  const count = document.getElementById("old-workspace-count");
  const summary = document.getElementById("old-workspace-summary");
  if (indicator) indicator.classList.toggle("has-items", oldCount > 0);
  if (count) count.textContent = String(oldCount);
  if (summary) {
    summary.textContent = oldCount === 0
      ? "Keine Fälle ab 30 Tagen vorhanden."
      : `${oldCount} ${oldCount === 1 ? "Fall ist" : "Fälle sind"} zu kontrollieren oder zu löschen.`;
  }
}

function workspaceStatusMarkup(snapshot) {
  const status = getWorkspaceOperationalStatus(snapshot);
  const className = status.key === "documented" ? "is-ready" : (status.key === "calculated" ? "is-calculated" : "is-open");
  return statusIndicatorMarkup(status.label, "phase5-case-status", className);
}

function workspaceCardMarkup(name, snapshot, oldList) {
  const summary = snapshot?.summary || {};
  const ageDays = getWorkspaceAgeDays(snapshot);
  const method = summary.method === "mixed" ? "Gemischte Methode" : "Reiner Einkommensvergleich";
  const grade = Number.isFinite(Number(summary.gradePercent)) ? `${Number(summary.gradePercent)}% IV Grad` : "IV Grad offen";
  const ageLabel = Number.isFinite(ageDays) ? `${ageDays} ${ageDays === 1 ? "Tag" : "Tage"}` : "Alter unbekannt";
  const isLoaded = APP_STATE.loadedWorkspaceName === name;
  const actionLabel = oldList ? "Kontrollieren" : "Laden";
  const oldHint = oldList ? `<div class="phase5-case-review">${escapeHtml(ageLabel)} seit letzter Speicherung. Nach Kontrolle neu speichern oder löschen.</div>` : "";
  return `
    <article class="phase5-case-card ${oldList ? "is-old" : "is-current"} ${isLoaded ? "is-loaded" : ""}" data-workspace-name="${escapeHtml(name)}">
      <div class="phase5-case-head">
        <div>
          <div class="phase5-case-title">${escapeHtml(name)}</div>
          <div class="phase5-case-saved">Gespeichert ${escapeHtml(formatWorkspaceSavedDate(snapshot, true))} · ${escapeHtml(ageLabel)}</div>
        </div>
        ${workspaceStatusMarkup(snapshot)}
      </div>
      <div class="phase5-case-facts">
        <span><strong>${escapeHtml(method)}</strong></span>
        <span>${escapeHtml(grade)}</span>
        <span>${Number(summary.periodCount || 0)} Zeitperioden</span>
        <span>${escapeHtml(formatWorkspacePeriod(summary))}</span>
      </div>
      ${summary.employeeName ? `<div class="phase5-case-person">Bearbeitung: ${escapeHtml(summary.employeeName)}${summary.editDate ? ` · ${escapeHtml(summary.editDate)}` : ""}</div>` : ""}
      ${oldHint}
      <div class="phase5-case-actions">
        <button class="btn-soft phase5-workspace-action" data-action="load" data-old="${oldList ? "1" : "0"}" data-name="${escapeHtml(name)}" type="button">${actionLabel}</button>
        <button class="btn-warn phase5-workspace-action" data-action="delete" data-old="${oldList ? "1" : "0"}" data-name="${escapeHtml(name)}" type="button">Löschen</button>
      </div>
    </article>`;
}

function renderWorkspaceCards(containerId, entries, oldList) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!entries.length) {
    container.innerHTML = emptyStateMarkup(
      oldList ? "Keine Arbeitsstände ab 30 Tagen vorhanden." : "Noch keine aktuellen Arbeitsstände vorhanden.",
      "phase5-case-empty"
    );
    return;
  }
  container.innerHTML = entries.map(([name, snapshot]) => workspaceCardMarkup(name, snapshot, oldList)).join("");
}

function updateWorkspaceDashboard(total, currentCount, oldCount) {
  const totalEl = document.getElementById("workspace-total-count");
  const currentEl = document.getElementById("workspace-current-count");
  const oldEl = document.getElementById("workspace-review-count");
  if (totalEl) totalEl.textContent = String(total);
  if (currentEl) currentEl.textContent = String(currentCount);
  if (oldEl) oldEl.textContent = String(oldCount);
}

function updateWorkspaceActiveState() {
  const activeName = document.getElementById("workspace-active-name");
  const activeState = document.getElementById("workspace-active-state");
  if (activeName) activeName.textContent = APP_STATE.loadedWorkspaceName || "Noch kein gespeicherter Arbeitsstand geladen";
  if (activeState) {
    if (!APP_STATE.loadedWorkspaceName) {
      activeState.className = "phase5-active-state is-neutral";
      activeState.textContent = APP_STATE.dirty ? "Neuer Arbeitsstand mit ungespeicherten Änderungen" : "Neuer Arbeitsstand";
    } else if (APP_STATE.dirty) {
      activeState.className = "phase5-active-state is-dirty";
      activeState.textContent = "Geändert, noch nicht gespeichert";
    } else {
      activeState.className = "phase5-active-state is-saved";
      activeState.textContent = "Gespeichert";
    }
  }
}

function renderWorkspaceOptions(selectedName = "", selectedList = "current") {
  const currentSelect = document.getElementById("workspace-select");
  const oldSelect = document.getElementById("workspace-old-select");
  const searchMeta = document.getElementById("workspace-search-meta");
  const currentMeta = document.getElementById("workspace-current-meta");
  const oldMeta = document.getElementById("workspace-old-meta");
  if (!currentSelect || !oldSelect) return;

  const workspaces = getStoredWorkspaces();
  const term = getWorkspaceSearchTerm();
  const allEntries = Object.entries(workspaces);
  const partitioned = partitionWorkspaces(workspaces, Date.now());
  const currentEntriesAll = partitioned.current;
  const oldEntriesAll = partitioned.old;
  const currentEntries = filterWorkspaceEntries(currentEntriesAll, term);
  const oldEntries = filterWorkspaceEntries(oldEntriesAll, term);

  currentSelect.innerHTML = buildWorkspaceOptions(currentEntries, false);
  oldSelect.innerHTML = buildWorkspaceOptions(oldEntries, true);

  if (selectedName) {
    const target = selectedList === "old" ? oldSelect : currentSelect;
    if (Array.from(target.options).some(option => option.value === selectedName)) target.value = selectedName;
  }

  updateOldWorkspaceOverview(oldEntriesAll.length);
  updateWorkspaceDashboard(allEntries.length, currentEntriesAll.length, oldEntriesAll.length);
  renderWorkspaceCards("workspace-current-cards", currentEntries, false);
  renderWorkspaceCards("workspace-old-cards", oldEntries, true);
  updateWorkspaceActiveState();

  if (currentMeta) {
    currentMeta.textContent = currentEntriesAll.length
      ? `${currentEntries.length} von ${currentEntriesAll.length} aktuellen Arbeitsständen angezeigt. Neueste Speicherung zuerst.`
      : "Noch keine aktuellen Arbeitsstände vorhanden.";
  }
  if (oldMeta) {
    oldMeta.textContent = oldEntriesAll.length
      ? `${oldEntries.length} von ${oldEntriesAll.length} kontrollpflichtigen Arbeitsständen angezeigt. Älteste Einträge zuerst.`
      : "Keine Arbeitsstände ab 30 Tagen vorhanden.";
  }
  if (searchMeta) {
    const total = allEntries.length;
    const visible = currentEntries.length + oldEntries.length;
    if (!total) {
      searchMeta.textContent = "Noch keine gespeicherten Einkommensvergleiche vorhanden.";
    } else if (term) {
      searchMeta.textContent = `${visible} von ${total} Arbeitsständen gefunden. Die Suche berücksichtigt Bezeichnung, Bearbeitung, Methode, Quellen und Zeiträume.`;
    } else {
      searchMeta.textContent = `${currentEntriesAll.length} aktuell, ${oldEntriesAll.length} ab 30 Tagen zu kontrollieren.`;
    }
  }
}

