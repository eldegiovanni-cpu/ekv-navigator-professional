/* Phase B Alpha 2: Application shell navigation. */
function activateTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(button => {
    button.addEventListener("click", () => activateTab(button.dataset.tab || "tab-ekv"));
  });
}

const NAVIGATION_FEATURE_API = Object.freeze({
  init: initTabs,
  activate: activateTab
});
