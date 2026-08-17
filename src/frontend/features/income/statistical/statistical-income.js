/* Phase B Alpha 2: fachlich getrenntes Income Feature. Runtime-Reihenfolge via build-manifest.json. */
function refreshFlowStatYears(side, mode) {
  const prefix = flowPrefix(side);
  const yearSelect = document.getElementById(prefix + "-stat-year");
  const previous = yearSelect.value;
  const years = mode ? getAvailableStatisticalYears(mode) : [];
  fillSelect(yearSelect, years);
  if (previous && years.includes(Number(previous))) yearSelect.value = previous;
}
function refreshFlowStatModeUI(side) {
  const prefix = flowPrefix(side);
  const mode = document.getElementById(prefix + "-stat-source").value;
  const skillWrap = document.getElementById(prefix + "-skill-wrap");
  if (!mode) {
    document.getElementById(prefix + "-stat-branch-label").textContent = "Branche";
    fillSelect(document.getElementById(prefix + "-stat-gender"), []);
    fillSelect(document.getElementById(prefix + "-stat-branch"), []);
    fillSelect(document.getElementById(prefix + "-stat-skill"), []);
    refreshFlowStatYears(side, "");
    skillWrap.classList.remove("hide");
    setStatControlState(prefix, "", "");
    updateStatSkillLabel(prefix, "");
    return;
  }
  const cfg = getModeConfig(DATA, mode);
  refreshFlowStatYears(side, mode);
  document.getElementById(prefix + "-stat-branch-label").textContent = cfg.branchLabel;
  fillSelect(document.getElementById(prefix + "-stat-gender"), cfg.genders);
  fillSelect(document.getElementById(prefix + "-stat-branch"), cfg.branches);
  fillSelect(document.getElementById(prefix + "-stat-skill"), cfg.skills, v => skillLabelForMode(mode, v));
  updateStatSkillLabel(prefix, mode);
  if (mode === "T17") {
    skillWrap.classList.add("hide");
  } else {
    skillWrap.classList.remove("hide");
  }
  setStatControlState(prefix, mode, document.getElementById(prefix + "-stat-gender").value);
}

function clearFlowStatResult(side, message = "") {
  const prefix = flowPrefix(side);
  [
    "monthly",
    "annual",
    "transfer",
    "source-year",
    "source-note",
    "hours",
    "base-index",
    "target-index",
    "parallel",
    "auto-abzug",
    "teilzeit",
    "transfer-note"
  ].forEach(suffix => {
    const element = document.getElementById(`${prefix}-stat-${suffix}`);
    if (element) element.textContent = ["monthly", "annual", "transfer"].includes(suffix) ? "0" : "";
  });
  resetFlowOutput(side);
  if (!message) return;

  const transferNote = document.getElementById(prefix + "-stat-transfer-note");
  const flowNote = document.getElementById(side === "valid" ? "flow-valid-note" : "flow-invalid-note");
  const statusBox = document.getElementById(side === "valid" ? "flow-valid-status-box" : "flow-invalid-status-box");
  if (transferNote) transferNote.textContent = message;
  if (flowNote) flowNote.textContent = message;
  if (statusBox) statusBox.textContent = "Aktuelle Quelle: Keine vollständige Datenbasis.";
  setFlowDetail(side, "Noch keine Berechnung übernommen. " + message);
  INCOME_COMPARISON_FEATURE_API.calculate();
}

function calcFlowStat(side) {
  const prefix = flowPrefix(side);
  const isValid = side === "valid";
  const mode = document.getElementById(prefix + "-stat-source").value;
  const yearValue = document.getElementById(prefix + "-stat-year").value;
  const genderEl = document.getElementById(prefix + "-stat-gender");
  const branchEl = document.getElementById(prefix + "-stat-branch");
  const skillEl = document.getElementById(prefix + "-stat-skill");
  setStatControlState(prefix, mode, genderEl.value);
  if (!mode || !yearValue || !genderEl.value || !branchEl.value || (mode !== "T17" && !skillEl.value)) {
    clearFlowStatResult(side);
    return;
  }
  const cfg = getModeConfig(DATA, mode);
  const year = Number(yearValue);
  const gender = genderEl.value;

  const branch = branchEl.value;
  const skill = mode === "T17" ? "Alle" : skillEl.value;
  const base = calculateStatisticalBase(DATA, { mode, year, gender, branch, skill });
  if (!hasCompleteStatisticalBase(base)) {
    clearFlowStatResult(side, "Für die gewählte Kombination ist in der hinterlegten Datenbasis kein vollständiger Wert vorhanden.");
    return;
  }
  const { monthly, hours, baseIndex, targetIndex, annual, qualityNotices = [] } = base;
  let finalValue = annual;
  let transferNote = isValid ? "Beim Valideneinkommen werden keine Abzüge berücksichtigt." : "Die Abzüge werden direkt berücksichtigt.";
  let detailItems = [];

  document.getElementById(prefix + "-stat-monthly").textContent = monthly ? fmtMoney(monthly) : "0";
  document.getElementById(prefix + "-stat-annual").textContent = annual ? fmtMoney(annual) : "0";
  document.getElementById(prefix + "-stat-source-year").textContent = monthly ? sourceYearLabel(DATA, mode, year) : "";
  const sourceNote = document.getElementById(prefix + "-stat-source-note");
  const qualityText = qualityNotices.length ? " | Datenhinweis: " + qualityNotices.join(" | ") : "";
  sourceNote.textContent = monthly ? cfg.label + " | " + sourceYearLabel(DATA, mode, year) + qualityText : "";
  sourceNote.classList.toggle("data-quality-warning", qualityNotices.length > 0);
  document.getElementById(prefix + "-stat-hours").textContent = hours ? fmtNum(hours, 1) : "";
  document.getElementById(prefix + "-stat-base-index").textContent = baseIndex ? fmtNum(baseIndex, 1) : "";
  document.getElementById(prefix + "-stat-target-index").textContent = targetIndex ? fmtNum(targetIndex, 1) : "";

  if (isValid) {
    const parallelIncomeInput = document.getElementById(prefix + "-stat-parallel-income").value;
    const parallelIncome = parallelIncomeInput === "" ? null : Number(parallelIncomeInput);
    const validResult = calculateValidStatisticalIncome(base, parallelIncome);
    finalValue = validResult.finalValue;
    transferNote = validResult.transferNote;
    const { parallelText } = validResult;
    document.getElementById(prefix + "-stat-parallel").textContent = parallelText;
    document.getElementById(prefix + "-stat-transfer").textContent = finalValue ? fmtMoney(finalValue) : "0";
    document.getElementById(prefix + "-stat-transfer-note").textContent = transferNote;
    detailItems = [
      "Quelle: " + cfg.label + " mit Zieljahr " + year,
      ...qualityNotices.map(note => "Datenhinweis: " + note),
      "Branche oder Berufsgruppe: " + branch,
      "Geschlecht: " + gender,
      (mode === "TA11" ? "Ausbildungsstand / Kaderfunktion: " : "Kompetenzniveau: ") + (mode === "T17" ? "Alle" : skillLabelForMode(mode, skill)),
      "Monatlicher LSE Betrag: " + fmtMoney(monthly || 0),
      "Betriebsübliche Arbeitszeit: " + fmtNum(hours || 0, 1),
      "Lohnindex Basisjahr: " + fmtNum(baseIndex || 0, 1),
      "Lohnindex Zieljahr: " + fmtNum(targetIndex || 0, 1),
      "Lohnindex Vermerk: Schweizerischer Lohnindex, Nominallohnindex, Basis 2010 = 100",
      "Jahreswert ohne Abzug: " + fmtMoney(annual || 0),
      "Parallelisierung: " + parallelText,
      "Übernommenes Valideneinkommen: " + fmtMoney(finalValue || 0)
    ];
    setFlowSelection(side, finalValue || 0, "Statistische Werte " + cfg.label, transferNote, detailListHtml(detailItems));
    return;
  }

  const besitzstand = document.getElementById(prefix + "-stat-besitzstand").value || "Nein";
  const restAfInput = document.getElementById(prefix + "-stat-restaf").value;
  const restAf = restAfInput === "" ? null : Number(restAfInput) / 100;
  const leidensInput = document.getElementById(prefix + "-stat-leidens").value;
  const leidens = leidensInput === "" ? null : Number(leidensInput) / 100;

  const invalidResult = calculateInvalidStatisticalIncome(base, { besitzstand, restAf, leidens });
  finalValue = invalidResult.finalValue;
  const {
    pauschalLabel,
    teilzeitLabel,
    deductionNote
  } = invalidResult;
  document.getElementById(prefix + "-stat-auto-abzug").textContent = pauschalLabel;
  document.getElementById(prefix + "-stat-teilzeit").textContent = teilzeitLabel;
  document.getElementById(prefix + "-stat-transfer").textContent = finalValue ? fmtMoney(finalValue) : "0";
  document.getElementById(prefix + "-stat-transfer-note").textContent = deductionNote;
  detailItems = [
    "Quelle: " + cfg.label + " mit Zieljahr " + year,
    ...qualityNotices.map(note => "Datenhinweis: " + note),
    "Branche oder Berufsgruppe: " + branch,
    "Geschlecht: " + gender,
    (mode === "TA11" ? "Ausbildungsstand / Kaderfunktion: " : "Kompetenzniveau: ") + (mode === "T17" ? "Alle" : skillLabelForMode(mode, skill)),
    "Monatlicher LSE Betrag: " + fmtMoney(monthly || 0),
    "Betriebsübliche Arbeitszeit: " + fmtNum(hours || 0, 1),
    "Lohnindex Basisjahr: " + fmtNum(baseIndex || 0, 1),
    "Lohnindex Zieljahr: " + fmtNum(targetIndex || 0, 1),
    "Lohnindex Vermerk: Schweizerischer Lohnindex, Nominallohnindex, Basis 2010 = 100",
    "Jahreswert ohne Abzug: " + fmtMoney(annual || 0),
    "Restarbeitsfähigkeit: " + (restAf !== null ? fmtPct(restAf, 0) : "nicht erfasst"),
    "Pauschalabzug: " + pauschalLabel,
    "Teilzeitabzug: " + teilzeitLabel,
    "Leidensbedingter Abzug: " + (leidens !== null ? fmtPct(leidens, 0) : "nicht erfasst"),
    "Übernommenes Invalideneinkommen: " + fmtMoney(finalValue || 0)
  ];
  setFlowSelection(side, finalValue || 0, "Statistische Werte " + cfg.label, deductionNote, detailListHtml(detailItems));
}

function initStatisticalIncome(side) {
  const prefix = flowPrefix(side);
  refreshFlowStatModeUI(side);
  [prefix + "-stat-source", prefix + "-stat-gender", prefix + "-stat-year", prefix + "-stat-branch", prefix + "-stat-skill", prefix + "-stat-parallel-income", prefix + "-stat-besitzstand", prefix + "-stat-restaf", prefix + "-stat-leidens"].forEach(id => {
    bindReactiveField(id, () => {
      if (id.endsWith("stat-source")) refreshFlowStatModeUI(side);
      calcFlowStat(side);
    });
  });
}
