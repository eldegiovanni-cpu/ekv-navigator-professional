/* Phase B Alpha 2: fachlich getrenntes Income Feature. Runtime-Reihenfolge via build-manifest.json. */
function getFlowSelectedWage(side) {
  const prefix = flowPrefix(side);
  const key = document.getElementById(prefix + "-wg-transfer-source").value;
  return selectWageResult({
    standard: Number(document.getElementById(prefix + "-wg-standard-result").dataset.raw || 0),
    season: Number(document.getElementById(prefix + "-wg-season-result").dataset.raw || 0),
    day: Number(document.getElementById(prefix + "-wg-day-result").dataset.raw || 0),
    week: Number(document.getElementById(prefix + "-wg-week-result").dataset.raw || 0)
  }, key);
}

function calcFlowWage(side) {
  const prefix = flowPrefix(side);
  const results = calculateWageResults({
    hourly: document.getElementById(prefix + "-wg-hourly").value,
    weeklyHours: document.getElementById(prefix + "-wg-weekly-hours").value,
    seasonHourly: document.getElementById(prefix + "-wg-season-hourly").value,
    annualHours: document.getElementById(prefix + "-wg-annual-hours").value,
    daily: document.getElementById(prefix + "-wg-daily").value,
    daysWeek: document.getElementById(prefix + "-wg-days-week").value,
    weekly: document.getElementById(prefix + "-wg-weekly").value
  });
  document.getElementById(prefix + "-wg-standard-result").textContent = fmtMoney(results.standard);
  document.getElementById(prefix + "-wg-season-result").textContent = fmtMoney(results.season);
  document.getElementById(prefix + "-wg-day-result").textContent = fmtMoney(results.day);
  document.getElementById(prefix + "-wg-week-result").textContent = fmtMoney(results.week);
  document.getElementById(prefix + "-wg-standard-result").dataset.raw = results.standard;
  document.getElementById(prefix + "-wg-season-result").dataset.raw = results.season;
  document.getElementById(prefix + "-wg-day-result").dataset.raw = results.day;
  document.getElementById(prefix + "-wg-week-result").dataset.raw = results.week;
  const selected = getFlowSelectedWage(side);
  document.getElementById(prefix + "-wg-transfer-value").textContent = fmtMoney(selected.value || 0) + " | " + selected.label;
  const detail = [
    "Quelle: " + selected.label,
    "Jahreslohn Standard: " + fmtMoney(results.standard),
    "Jahreslohn Saisonalbetrieb: " + fmtMoney(results.season),
    "Jahreslohn Taglohn: " + fmtMoney(results.day),
    "Jahreslohn Wochenlohn: " + fmtMoney(results.week),
    "Übernommener Wert: " + fmtMoney(selected.value || 0)
  ];
  setFlowSelection(side, selected.value || 0, selected.label, "Der ausgewählte Wert aus dem Lohnrechner wurde übernommen.", detailListHtml(detail));
}

function initWageCalculator(side) {
  const prefix = flowPrefix(side);
  [prefix + "-wg-hourly", prefix + "-wg-weekly-hours", prefix + "-wg-season-hourly", prefix + "-wg-annual-hours", prefix + "-wg-daily", prefix + "-wg-days-week", prefix + "-wg-weekly"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => calcFlowWage(side));
  });
  document.getElementById(prefix + "-wg-transfer-source").addEventListener("change", () => calcFlowWage(side));
}
