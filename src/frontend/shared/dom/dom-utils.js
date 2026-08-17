/* Phase 3: ausschliesslich DOM-nahe Hilfsfunktionen. */
const skillLabels = Object.freeze({ "Alle": "Alle", "4": "4", "3": "3", "2": "2", "1": "1" });
const ta11SkillLabels = Object.freeze({
  "Alle": "Totalwert",
  "1+2": "Kompetenzniveau 1+2, oberes und mittleres Kader",
  "3": "Kompetenzniveau 3, unteres Kader",
  "4": "Kompetenzniveau 4, ohne Kaderfunktion"
});

function skillLabelForMode(mode, value) {
  if (mode === "TA11") return ta11SkillLabels[value] || value;
  return skillLabels[value] || value;
}

function fillSelect(select, values, formatter = v => v, options = {}) {
  const current = select.value;
  const placeholder = Object.prototype.hasOwnProperty.call(options, "placeholder") ? options.placeholder : "Bitte auswählen";
  const includePlaceholder = options.includePlaceholder !== false;
  select.innerHTML = "";
  if (includePlaceholder) {
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = placeholder;
    select.appendChild(emptyOpt);
  }
  values.forEach(value => {
    const opt = document.createElement("option");
    opt.value = String(value);
    opt.textContent = formatter(value);
    select.appendChild(opt);
  });
  if (values.some(value => String(value) === String(current))) select.value = current;
  else select.value = "";
}

function bindReactiveField(id, handler) {
  const element = document.getElementById(id);
  if (!element) return;
  const eventName = element.tagName === "SELECT" || element.type === "date" ? "change" : "input";
  element.addEventListener(eventName, handler);
}

function setStatControlState(prefix, mode, gender) {
  const id = suffix => prefix ? `${prefix}-stat-${suffix}` : `stat-${suffix}`;
  const branch = document.getElementById(id("branch"));
  const skill = document.getElementById(id("skill"));
  if (!branch || !skill) return;

  branch.disabled = false;
  skill.disabled = false;

  if (mode === "T17") {
    skill.value = "Alle";
    skill.disabled = true;
  }

  if (mode === "TA01" && gender === "VE Frühinvalide") {
    branch.value = "05-96 Total";
    skill.value = "Alle";
    branch.disabled = true;
    skill.disabled = true;
  }
}

function updateStatSkillLabel(prefix, mode) {
  const selectId = prefix ? `${prefix}-stat-skill` : "stat-skill";
  const label = document.querySelector(`label[for="${selectId}"]`);
  if (!label) return;
  label.textContent = mode === "TA11"
    ? "Kaderfunktion / Kompetenzniveau TA11"
    : "Kompetenzniveau";
}

function refillSelectKeepingValue(id, values) {
  const el = document.getElementById(id);
  if (!el) return;
  const old = el.value;
  fillSelect(el, values);
  if (values.map(String).includes(String(old))) el.value = old;
}

function refreshYearSelects() {
  ["fv-stat-year", "fi-stat-year"].forEach(id => refillSelectKeepingValue(id, yearsStat));
  ["fv-inc-target-year", "fi-inc-target-year"].forEach(id => refillSelectKeepingValue(id, yearsIncome.filter(y => y >= 2010)));
  ["fv-direct-source-year", "fi-direct-source-year"].forEach(id => refillSelectKeepingValue(id, yearsIncome));
  ["fv-direct-target-year", "fi-direct-target-year"].forEach(id => refillSelectKeepingValue(id, yearsIncome.filter(y => y >= 2010)));
  document.querySelectorAll(".inc-year").forEach(select => {
    const current = select.value;
    fillSelect(select, yearsIncome);
    if (yearsIncome.map(String).includes(String(current))) select.value = current;
  });
}

function refillBranchSelectKeepingValue(id, values) {
  const el = document.getElementById(id);
  if (!el) return;
  const old = el.value;
  fillSelect(el, values);
  if (values.includes(old)) el.value = old;
}

/* Phase B Alpha 5: gemeinsame DOM Hilfen für Views und Formularadapter. */
function getElement(id) {
  return document.getElementById(id);
}

function setTextContent(id, value) {
  const element = getElement(id);
  if (element) element.textContent = value == null ? "" : String(value);
  return element;
}

function setElementHidden(id, hidden) {
  const element = getElement(id);
  if (element) element.classList.toggle("hide", !!hidden);
  return element;
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}
