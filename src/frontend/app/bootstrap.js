/* Extracted from certified EKV 2.1 reference. Runtime order managed by scripts/build.py. */
window.addEventListener("beforeunload", (event) => { if (APP_STATE.dirty) { event.preventDefault(); event.returnValue = ""; } });

INCOME_FEATURE_API.init();
APPLICATION_FEATURE_API.init();
