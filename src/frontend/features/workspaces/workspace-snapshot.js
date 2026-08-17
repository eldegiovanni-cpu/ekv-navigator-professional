function getCurrentEkvResultForSummary() {
  const method = document.getElementById("ekv-method")?.value || "pure";
  const result = calculateEkvCase({
    validIncome: document.getElementById("ekv-valid")?.value || 0,
    invalidIncome: document.getElementById("ekv-invalid")?.value || 0,
    method,
    employmentShare: Number(document.getElementById("ekv-employment-share")?.value || 0) / 100,
    householdShare: Number(document.getElementById("ekv-household-share")?.value || 0) / 100,
    householdLimitation: Number(document.getElementById("ekv-household-limitation")?.value || 0) / 100
  });
  return {
    method,
    validIncome: result.valid,
    invalidIncome: result.invalid,
    gradePercent: Math.round(((method === "mixed" && result.mixed) ? result.mixed.finalGrade : result.grade) * 100)
  };
}

function buildWorkspaceSummary(formState) {
  const values = formState?.values || {};
  const result = getCurrentEkvResultForSummary();
  const validation = validateEkvCase({
    periodFrom: values["ekv-period-from"] || "",
    validIncome: result.validIncome,
    invalidIncome: result.invalidIncome,
    method: result.method,
    employmentSharePercent: Number(values["ekv-employment-share"] || 0),
    householdSharePercent: Number(values["ekv-household-share"] || 0),
    householdLimitationRaw: values["ekv-household-limitation"] ?? "",
    validDetail: formState?.flowDetails?.valid || "",
    invalidDetail: formState?.flowDetails?.invalid || "",
    validReason: values["ekv-valid-reason"] || "",
    invalidReason: values["ekv-invalid-reason"] || "",
    employeeName: values["ekv-employee-name"] || "",
    editDate: values["ekv-edit-date"] || "",
    genderMismatchMessage: typeof getGenderMismatchMessage === "function" ? getGenderMismatchMessage() : ""
  });

  return {
    employeeName: String(values["ekv-employee-name"] || "").trim(),
    editDate: values["ekv-edit-date"] || "",
    method: result.method,
    validIncome: result.validIncome,
    invalidIncome: result.invalidIncome,
    gradePercent: result.gradePercent,
    validSource: formState?.ekvState?.validSource || "",
    invalidSource: formState?.ekvState?.invalidSource || "",
    periodFrom: values["ekv-period-from"] || "",
    periodTo: values["ekv-period-to"] || "",
    periodCount: APP_STATE.savedPeriods.length,
    status: validation.complete ? "documented" : ((result.validIncome > 0 && result.invalidIncome >= 0) ? "calculated" : "incomplete")
  };
}

function collectWorkspaceSnapshot() {
  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab || "tab-ekv";
  const currentFormState = captureEkvFormState();
  return {
    schemaVersion: WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    activeTab: normalizeActiveTab(activeTab),
    currentFormState,
    summary: buildWorkspaceSummary(currentFormState),
    savedPeriods: APP_STATE.savedPeriods.map((period, index) => migratePeriod(period, index))
  };
}

