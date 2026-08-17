import { extractNogaCode, normalizeBfsLabel, resolveCanonicalBranch } from "../mappings/harmonization.mjs";

function buildLabelResolver(labels = []) {
  const exact = new Map();
  const normalized = new Map();
  const ambiguous = new Set();
  labels.filter(Boolean).forEach(label => {
    exact.set(label, label);
    const key = normalizeBfsLabel(label);
    if (normalized.has(key) && normalized.get(key) !== label) ambiguous.add(key);
    else normalized.set(key, label);
  });
  return { exact, normalized, ambiguous };
}

function resolveModeBranch(data, mode, rawLabel) {
  const raw = String(rawLabel ?? "").trim();
  if (!raw) return { status: "unresolved", raw, canonical: null, method: "empty" };
  const labels = data?.modes?.[mode]?.branches || [];
  const resolver = buildLabelResolver(labels);
  if (resolver.exact.has(raw)) return { status: "matched", raw, canonical: raw, method: "exact" };
  const norm = normalizeBfsLabel(raw);
  if (!resolver.ambiguous.has(norm) && resolver.normalized.has(norm)) {
    return { status: "matched", raw, canonical: resolver.normalized.get(norm), method: "normalized" };
  }
  const code = extractNogaCode(raw);
  if (code) {
    const byCode = labels.filter(label => extractNogaCode(label) === code);
    if (byCode.length === 1) return { status: "matched", raw, canonical: byCode[0], method: "category-code" };
  }
  return { status: "unresolved", raw, canonical: null, method: code ? "category-code-unresolved" : "label-unresolved" };
}

function resolveDatasetCategory({ data, aliases, definition, rawLabel }) {
  if (definition.categoryKind === "noga") return resolveCanonicalBranch(data, rawLabel, aliases);
  if (definition.categoryKind === "mode-branch") return resolveModeBranch(data, definition.mode, rawLabel);
  return { status: "unresolved", raw: String(rawLabel ?? ""), canonical: null, method: "unsupported-category-kind" };
}

export { buildLabelResolver, resolveDatasetCategory, resolveModeBranch };
