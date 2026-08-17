import { EKV_RULES } from "../rules/ekv-rules.mjs";
import { createWorkspaceStore, migrateWorkspaceStore } from "./workspace-migrations.mjs";
const WORKSPACE_DAY_MS = 24 * 60 * 60 * 1000;
export function getWorkspaceSavedTimestamp(snapshot) { const timestamp = Date.parse(snapshot?.savedAt || ""); return Number.isFinite(timestamp) ? timestamp : 0; }
export function getWorkspaceAgeDays(snapshot, now = Date.now()) { const nowValue = now instanceof Date ? now.getTime() : Number(now); const savedAt = getWorkspaceSavedTimestamp(snapshot); if (!savedAt || !Number.isFinite(nowValue)) return Number.POSITIVE_INFINITY; return Math.max(0, Math.floor((nowValue - savedAt) / WORKSPACE_DAY_MS)); }
export function isOldWorkspace(snapshot, now = Date.now()) { return getWorkspaceAgeDays(snapshot, now) >= EKV_RULES.workspace.oldAfterDays; }
export function partitionWorkspaces(workspaces, now = Date.now()) {
  const current = [], old = [];
  Object.entries(workspaces || {}).forEach(([name, snapshot]) => { const ageDays = getWorkspaceAgeDays(snapshot, now); const entry = [name, snapshot, ageDays]; if (ageDays >= EKV_RULES.workspace.oldAfterDays) old.push(entry); else current.push(entry); });
  current.sort(([, a], [, b]) => getWorkspaceSavedTimestamp(b) - getWorkspaceSavedTimestamp(a));
  old.sort(([, a], [, b]) => getWorkspaceSavedTimestamp(a) - getWorkspaceSavedTimestamp(b));
  return { current, old, oldCount: old.length };
}
export function getWorkspaceSearchText(name, snapshot) { const summary = snapshot?.summary || {}; return [name, summary.employeeName, summary.editDate, summary.method === "mixed" ? "gemischte methode" : "reiner einkommensvergleich", summary.validSource, summary.invalidSource, summary.periodFrom, summary.periodTo, summary.status].filter(Boolean).join(" ").toLocaleLowerCase("de-CH"); }
export function filterWorkspaceEntries(entries, term = "") { const needle = String(term || "").trim().toLocaleLowerCase("de-CH"); return needle ? (entries || []).filter(([name, snapshot]) => getWorkspaceSearchText(name, snapshot).includes(needle)) : [...(entries || [])]; }
export function getWorkspaceOperationalStatus(snapshot) { const status = snapshot?.summary?.status; if (status === "documented") return { key: "documented", label: "Dokumentiert" }; if (status === "calculated") return { key: "calculated", label: "Berechnet" }; return { key: "incomplete", label: "In Bearbeitung" }; }
export function parseWorkspaceStore(rawValue) { if (!rawValue) return createWorkspaceStore({}); let parsed; try { parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue; } catch { throw new Error("Gespeicherte Arbeitsstände enthalten ungültiges JSON."); } return migrateWorkspaceStore(parsed).store; }
export function upsertWorkspace(store, name, snapshot) { const normalizedName = String(name || "").trim(); if (!normalizedName) throw new Error("Name des Arbeitsstands fehlt."); const current = migrateWorkspaceStore(store || {}).store; return createWorkspaceStore({ ...current.workspaces, [normalizedName]: snapshot }); }
export function removeWorkspace(store, name) { const current = migrateWorkspaceStore(store || {}).store; const workspaces = { ...current.workspaces }; delete workspaces[String(name || "").trim()]; return createWorkspaceStore(workspaces); }
