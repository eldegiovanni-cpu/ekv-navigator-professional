/* Extracted from certified EKV 2.1 reference. Runtime order managed by scripts/build.py. */
/* Erweiterung 21.05.2026: LSE TA11 privater Sektor als dritte LSE Quelle */
(function installTa11Extension() {
  const TA11_MODE = DATA.modes.TA11;


  function addTa11Option(selectId) {
    const select = document.getElementById(selectId);
    if (!select || Array.from(select.options).some(o => o.value === "TA11")) return;
    const opt = document.createElement("option");
    opt.value = "TA11";
    opt.textContent = "LSE TA11";
    select.appendChild(opt);
  }
  ["stat-source", "fv-stat-source", "fi-stat-source"].forEach(addTa11Option);


})();
