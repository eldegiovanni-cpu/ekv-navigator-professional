/* Phase 4: additive Benutzerführung. Keine Berechnung und keine Persistenz. */
function phase4SetStatusChip(id, label, state) {
  setStatusIndicator(id, label, "phase4-status-chip", "is-" + state);
}

function phase4SetWorkflowState(id, label, state) {
  const stateEl = document.getElementById(id);
  if (!stateEl) return;
  stateEl.textContent = label;
  const step = stateEl.closest(".phase4-workflow-step");
  if (!step) return;
  step.classList.toggle("is-complete", state === "complete");
  step.classList.toggle("is-active", state === "active");
}

function phase4GetVisibleGrade() {
  const method = document.getElementById("ekv-method")?.value || "pure";
  const source = method === "mixed" ? document.getElementById("ekv-final-grade") : document.getElementById("ekv-grade");
  return (source?.textContent || "0%").trim();
}

function phase4FirstIssue() {
  const first = document.querySelector("#ekv-validation-list li");
  return (first?.textContent || "").trim();
}

function updatePhase4Guidance() {
  const validComplete = (document.getElementById("ekv-valid-status-state")?.textContent || "") === "Vollständig";
  const invalidComplete = (document.getElementById("ekv-invalid-status-state")?.textContent || "") === "Vollständig";
  const validation = document.getElementById("ekv-validation-list");
  const resultComplete = !!validation?.classList.contains("good");
  const periodFrom = !!document.getElementById("ekv-period-from")?.value;
  const grade = phase4GetVisibleGrade();

  phase4SetStatusChip("phase4-valid-chip", validComplete ? "Vollständig" : "Offen", validComplete ? "complete" : "active");
  phase4SetStatusChip("phase4-invalid-chip", invalidComplete ? "Vollständig" : "Offen", invalidComplete ? "complete" : (validComplete ? "active" : "open"));
  phase4SetStatusChip("phase4-result-chip", resultComplete ? "Bereit" : (validComplete && invalidComplete ? "Prüfen" : "Offen"), resultComplete ? "complete" : (validComplete && invalidComplete ? "active" : "open"));

  phase4SetWorkflowState("phase4-step-valid", validComplete ? "Vollständig" : "Als Erstes bearbeiten", validComplete ? "complete" : "active");
  phase4SetWorkflowState("phase4-step-invalid", invalidComplete ? "Vollständig" : (validComplete ? "Als Nächstes bearbeiten" : "Noch offen"), invalidComplete ? "complete" : (validComplete ? "active" : "open"));
  phase4SetWorkflowState("phase4-step-result", resultComplete ? "Dokumentation vollständig" : (validComplete && invalidComplete ? "Ergebnis prüfen und dokumentieren" : "Noch offen"), resultComplete ? "complete" : (validComplete && invalidComplete ? "active" : "open"));

  const gradeEl = document.getElementById("phase4-grade-value");
  if (gradeEl) gradeEl.textContent = grade;

  const status = document.getElementById("phase4-result-status");
  const next = document.getElementById("phase4-next-action");
  const overview = document.getElementById("phase4-result-overview");
  if (overview) overview.classList.toggle("is-complete", resultComplete);

  let statusText = "Berechnung noch offen";
  let nextText = "Beginne mit dem Valideneinkommen.";
  if (validComplete && !invalidComplete) {
    statusText = "Valideneinkommen vollständig";
    nextText = "Erfasse jetzt das Invalideneinkommen.";
  } else if (validComplete && invalidComplete && !resultComplete) {
    statusText = "Einkommensvergleich berechnet";
    const issue = phase4FirstIssue();
    nextText = issue || (periodFrom ? "Dokumentation prüfen und Zeitperiode speichern." : "Startdatum der Zeitperiode erfassen.");
  } else if (resultComplete) {
    statusText = "Berechnung vollständig dokumentiert";
    nextText = "Zeitperiode speichern oder die vorhandenen Exportfunktionen verwenden.";
  }
  if (status) status.textContent = statusText;
  if (next) next.textContent = nextText;
}

function initPhase4Shell() {
  document.querySelectorAll(".phase4-workflow-step[data-scroll-target]").forEach(button => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.scrollTarget || "");
      if (!target) return;
      const card = target.closest(".flow-card, .summary-card") || target;
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => target.focus({ preventScroll: true }), 250);
    });
  });

  document.addEventListener("input", () => requestAnimationFrame(updatePhase4Guidance));
  document.addEventListener("change", () => requestAnimationFrame(updatePhase4Guidance));

  const validation = document.getElementById("ekv-validation-list");
  if (validation && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => requestAnimationFrame(updatePhase4Guidance));
    observer.observe(validation, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  updatePhase4Guidance();
}

const GUIDANCE_FEATURE_API = Object.freeze({
  init: initPhase4Shell,
  update: updatePhase4Guidance
});
