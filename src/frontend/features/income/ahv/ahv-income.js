/* Phase B Alpha 2: fachlich getrenntes Income Feature. Runtime-Reihenfolge via build-manifest.json. */
function updateFlowIncomeColumnVisibility(side) {
  const prefix = flowPrefix(side);
  const kind = document.getElementById(prefix + "-inc-kind")?.value || "full";
  const showPartial = kind === "partial";
  document.querySelectorAll("#" + prefix + "-income-table .inc-partial-col").forEach(el => {
    el.classList.toggle("hide", !showPartial);
  });
}

function buildFlowIncomeRows(side) {
  const prefix = flowPrefix(side);
  const tbody = document.querySelector("#" + prefix + "-income-table tbody");
  tbody.innerHTML = "";
  for (let i = 0; i < 5; i += 1) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><select class="inc-year"></select></td>
      <td><input class="inc-amount" type="number" min="0" step="0.01"></td>
      <td class="inc-partial-col hide"><input class="inc-pensum" type="number" min="0.1" max="100" step="0.1" placeholder="z.B. 50"></td>
      <td class="inc-full-amount inc-partial-col hide"></td>
      <td class="inc-source-index"></td>
      <td class="inc-target-index"></td>
      <td class="inc-total"></td>
    `;
    tbody.appendChild(tr);
    fillSelect(tr.querySelector(".inc-year"), yearsIncome);
    tr.querySelector(".inc-year").addEventListener("change", () => calcFlowIncome(side));
    tr.querySelector(".inc-amount").addEventListener("input", () => calcFlowIncome(side));
    tr.querySelector(".inc-pensum").addEventListener("input", () => calcFlowIncome(side));
  }
  updateFlowIncomeColumnVisibility(side);
}

function calcFlowIncome(side) {
  const prefix = flowPrefix(side);
  const gender = document.getElementById(prefix + "-inc-gender").value;
  const targetYearValue = document.getElementById(prefix + "-inc-target-year").value;
  const targetYear = Number(targetYearValue);
  const branch = document.getElementById(prefix + "-inc-branch").value;
  const source = document.getElementById(prefix + "-inc-source").value;
  const kind = document.getElementById(prefix + "-inc-kind")?.value || "full";
  updateFlowIncomeColumnVisibility(side);
  document.getElementById(prefix + "-inc-source-text").textContent = DATA.incomeSourceTexts[source] || "";
  if (!gender || !targetYearValue || !branch || !source) {
    document.getElementById(prefix + "-inc-average").textContent = "0";
    document.querySelectorAll("#" + prefix + "-income-table tbody tr").forEach(tr => {
      tr.querySelector(".inc-full-amount").textContent = "";
      tr.querySelector(".inc-source-index").textContent = "";
      tr.querySelector(".inc-target-index").textContent = "";
      tr.querySelector(".inc-total").textContent = "";
    });
    resetFlowOutput(side);
    return;
  }
  const targetIndex = getIncomeIndex(DATA, branch, gender, targetYear);
  const calculatedRows = [];
  const detailRows = [];
  document.querySelectorAll("#" + prefix + "-income-table tbody tr").forEach(tr => {
    const year = Number(tr.querySelector(".inc-year").value);
    const amountVal = tr.querySelector(".inc-amount").value;
    const amount = amountVal === "" ? null : Number(amountVal);
    const pensumVal = tr.querySelector(".inc-pensum").value;
    const pensum = pensumVal === "" ? null : Number(pensumVal);
    const fullAmountCell = tr.querySelector(".inc-full-amount");
    const sourceCell = tr.querySelector(".inc-source-index");
    const targetCell = tr.querySelector(".inc-target-index");
    const totalCell = tr.querySelector(".inc-total");
    const sourceIndex = year ? getIncomeIndex(DATA, branch, gender, year) : null;
    const rowResult = calculateIncomeRow({
      amount,
      kind,
      pensum,
      sourceIndex,
      targetIndex
    });
    calculatedRows.push(rowResult);

    if (year && rowResult.fullAmount !== null && targetIndex) {
      fullAmountCell.textContent = fmtMoney(rowResult.fullAmount);
      sourceCell.textContent = rowResult.sourceIndex ? fmtNum(rowResult.sourceIndex, 1) : "";
      targetCell.textContent = fmtNum(targetIndex, 1);
      totalCell.textContent = rowResult.complete ? fmtMoney(rowResult.uprated) : "";
      if (rowResult.complete) {
        detailRows.push(
          "Ausgangsjahr " + year + ": Einkommen " + fmtMoney(amount) +
          (kind === "partial" ? " bei " + fmtNum(pensum, 1) + " Prozent Pensum, hochgerechnet auf " + fmtMoney(rowResult.fullAmount) : " als 100 Prozent Einkommen") +
          " | Lohnindex Ausgangsjahr: " + fmtNum(rowResult.sourceIndex, 1) +
          " | Zieljahr " + targetYear +
          " | Lohnindex Zieljahr: " + fmtNum(targetIndex, 1) +
          " | Aufgerechneter Wert: " + fmtMoney(rowResult.uprated)
        );
      }
    } else {
      fullAmountCell.textContent = kind === "partial" && amount !== null && !rowResult.validPensum ? "Pensum fehlt" : "";
      sourceCell.textContent = "";
      targetCell.textContent = year && targetIndex ? fmtNum(targetIndex, 1) : "";
      totalCell.textContent = "";
    }
  });
  const { average: avg, count } = calculateIncomeAverage(calculatedRows);
  document.getElementById(prefix + "-inc-average").textContent = avg ? fmtMoney(avg) : "0";
  const detail = [
    "Aufgerechnetes Jahr: " + targetYear,
    "Branche: " + branch,
    "Geschlecht: " + gender,
    "Berücksichtigte Jahre: " + count,
    "Lohnindex Vermerk: Schweizerischer Lohnindex, Nominallohnindex, Basis 2010 = 100",
    ...detailRows,
    "Übernommener Durchschnitt: " + fmtMoney(avg || 0)
  ];
  setFlowSelection(side, avg || 0, "AHV Einkommen Durchschnitt", "Der Durchschnitt der aufgerechneten Jahre wurde übernommen.", detailListHtml(detail));
}

function initAhvIncome(side) {
  const prefix = flowPrefix(side);
  fillSelect(document.getElementById(prefix + "-inc-gender"), ["Mann","Frau"]);
  fillSelect(document.getElementById(prefix + "-inc-target-year"), yearsIncome.filter(y => y >= 2010));
  fillSelect(document.getElementById(prefix + "-inc-branch"), DATA.incomeBranches);
  fillSelect(document.getElementById(prefix + "-inc-source"), DATA.incomeSources);
  buildFlowIncomeRows(side);
  [prefix + "-inc-gender", prefix + "-inc-target-year", prefix + "-inc-branch", prefix + "-inc-source", prefix + "-inc-kind"].forEach(id => {
    bindReactiveField(id, () => calcFlowIncome(side));
  });
}
