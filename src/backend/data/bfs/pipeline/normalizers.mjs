function normalizeYear(value) {
  const year = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? String(year) : null;
}

function normalizeNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim().replace(/\s/g, "").replace(/’/g, "").replace(/'/g, "");
  if (!text) return null;
  const normalized = text.includes(",") && !text.includes(".") ? text.replace(",", ".") : text.replace(/,/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeGender(value) {
  const raw = String(value ?? "").trim();
  const key = raw.toLocaleLowerCase("de-CH");
  const map = new Map([
    ["m", "Mann"], ["mann", "Mann"], ["männer", "Mann"], ["maenner", "Mann"],
    ["f", "Frau"], ["frau", "Frau"], ["frauen", "Frau"],
    ["neutral", "Neutral"], ["total", "Neutral"], ["gesamt", "Neutral"], ["beide geschlechter", "Neutral"]
  ]);
  return map.get(key) || raw;
}

function normalizeSkill(value) {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

function normalizeBfsRawRow(row, definition) {
  const normalized = { ...row };
  if ("year" in normalized) normalized.year = normalizeYear(normalized.year);
  if (definition?.valueField) normalized[definition.valueField] = normalizeNumber(normalized[definition.valueField]);
  if ("gender" in normalized) normalized.gender = normalizeGender(normalized.gender);
  if ("skill" in normalized) normalized.skill = normalizeSkill(normalized.skill);
  if (definition?.categoryField && normalized[definition.categoryField] !== undefined) {
    normalized[definition.categoryField] = String(normalized[definition.categoryField]).trim();
  }
  return normalized;
}

export { normalizeBfsRawRow, normalizeGender, normalizeNumber, normalizeSkill, normalizeYear };
