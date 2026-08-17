/* Phase B Alpha 2: fachlich getrenntes Income Feature. Runtime-Reihenfolge via build-manifest.json. */
function calcFlowDirect(side) {
  const prefix = flowPrefix(side);
  const income = Number(document.getElementById(prefix + "-direct-income")?.value || 0);
  const kind = document.getElementById(prefix + "-direct-kind")?.value || "full";
  const pensumRaw = document.getElementById(prefix + "-direct-pensum")?.value || "";
  const pensum = Number(pensumRaw || 0);
  const indexEnabled = document.getElementById(prefix + "-direct-index-enabled")?.value || "Nein";
  const sourceYearValue = document.getElementById(prefix + "-direct-source-year")?.value || "";
  const targetYearValue = document.getElementById(prefix + "-direct-target-year")?.value || "";
  const sourceYear = Number(sourceYearValue || 0);
  const targetYear = Number(targetYearValue || 0);
  const gender = document.getElementById(prefix + "-direct-gender")?.value || "";
  const branch = document.getElementById(prefix + "-direct-branch")?.value || "";

  const partialRow = document.getElementById(prefix + "-direct-partial-row");
  if (partialRow) partialRow.classList.toggle("hide", kind !== "partial");
  const indexRow = document.getElementById(prefix + "-direct-index-row");
  if (indexRow) indexRow.classList.toggle("hide", indexEnabled !== "Ja");

  let noteText = "Direkt eingetragener 100 Prozent Lohn wurde übernommen.";
  if (kind === "partial") {
    noteText = "Teil ET Lohn wurde auf ein 100 Prozent Pensum hochgerechnet.";
  }

  let sourceIndex = null;
  let targetIndex = null;
  if (indexEnabled === "Ja") {
    sourceIndex = sourceYear ? getIncomeIndex(DATA, branch, gender, sourceYear) : null;
    targetIndex = targetYear ? getIncomeIndex(DATA, branch, gender, targetYear) : null;
  }

  const result = calculateDirectIncome({
    income,
    kind,
    pensum,
    indexEnabled: indexEnabled === "Ja",
    sourceIndex,
    targetIndex
  });
  const { baseValue, finalValue } = result;

  const upratedEl = document.getElementById(prefix + "-direct-uprated");
  if (upratedEl) upratedEl.textContent = fmtMoney(baseValue || 0);

  let indexNote = "Keine Indexierung";

  if (indexEnabled === "Ja") {
    if (result.complete) {
      noteText += " Der Lohn wurde mit dem Nominallohnindex aufgerechnet.";
      indexNote = "Indexierung: " + sourceYear + " → " + targetYear + " | " + fmtNum(sourceIndex, 1) + " → " + fmtNum(targetIndex, 1);
    } else {
      indexNote = "Für die Indexierung bitte Ausgangsjahr, Zieljahr, Geschlecht und Branche vollständig erfassen.";
    }
  }

  const indexedEl = document.getElementById(prefix + "-direct-indexed");
  if (indexedEl) indexedEl.textContent = fmtMoney(finalValue || 0);
  const indexNoteEl = document.getElementById(prefix + "-direct-index-note");
  if (indexNoteEl) indexNoteEl.textContent = indexNote;

  const transferEl = document.getElementById(prefix + "-direct-transfer");
  if (transferEl) transferEl.textContent = finalValue ? fmtMoney(finalValue) : "0";
  const transferNoteEl = document.getElementById(prefix + "-direct-transfer-note");
  if (transferNoteEl) transferNoteEl.textContent = noteText;

  if (!result.complete) {
    resetFlowOutput(side);
    return;
  }

  const detail = [
    "Quelle: Einkommen manuell festlegen",
    "Eingetragener Lohn: " + fmtMoney(income),
    "Art der Eingabe: " + (kind === "partial" ? "Teil ET Lohn" : "100 Prozent Lohn"),
    kind === "partial" ? "Effektives Pensum: " + fmtPct(pensum / 100, 1) : "Effektives Pensum: 100 Prozent",
    kind === "partial" ? "Hochrechnung: eingetragener Lohn ÷ Pensum × 100 = " + fmtMoney(baseValue || 0) : "Keine Hochrechnung erforderlich",
    "Lohnindex berücksichtigen: " + indexEnabled,
    indexEnabled === "Ja" ? "Ausgangsjahr: " + sourceYear : "Ausgangsjahr: nicht erforderlich",
    indexEnabled === "Ja" ? "Zieljahr: " + targetYear : "Zieljahr: nicht erforderlich",
    indexEnabled === "Ja" ? "Geschlecht: " + gender : "Geschlecht: nicht erforderlich",
    indexEnabled === "Ja" ? "Branche: " + branch : "Branche: nicht erforderlich",
    indexEnabled === "Ja" ? "Lohnindex Ausgangsjahr: " + fmtNum(sourceIndex || 0, 1) : "Lohnindex Ausgangsjahr: nicht berücksichtigt",
    indexEnabled === "Ja" ? "Lohnindex Zieljahr: " + fmtNum(targetIndex || 0, 1) : "Lohnindex Zieljahr: nicht berücksichtigt",
    indexEnabled === "Ja" ? "Indexierung: Basislohn ÷ Ausgangsindex × Zielindex" : "Keine Indexierung, der Lohn bleibt unverändert",
    "Übernommener Wert: " + fmtMoney(finalValue || 0)
  ];
  setFlowSelection(side, finalValue || 0, "Einkommen manuell festlegen", noteText, detailListHtml(detail));
}

function initDirectIncome(side) {
  const prefix = flowPrefix(side);
  fillSelect(document.getElementById(prefix + "-direct-source-year"), yearsIncome);
  fillSelect(document.getElementById(prefix + "-direct-target-year"), yearsIncome.filter(y => y >= 2010));
  fillSelect(document.getElementById(prefix + "-direct-gender"), ["Mann","Frau"]);
  fillSelect(document.getElementById(prefix + "-direct-branch"), DATA.incomeBranches);
  [prefix + "-direct-income", prefix + "-direct-kind", prefix + "-direct-pensum", prefix + "-direct-index-enabled", prefix + "-direct-source-year", prefix + "-direct-target-year", prefix + "-direct-gender", prefix + "-direct-branch"].forEach(id => {
    bindReactiveField(id, () => calcFlowDirect(side));
  });
}
