"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const manifest = JSON.parse(read("src/build-manifest.json"));

const workspace = {
  repository: "src/frontend/features/workspaces/workspace-repository.js",
  snapshot: "src/frontend/features/workspaces/workspace-snapshot.js",
  view: "src/frontend/features/workspaces/workspace-view.js",
  status: "src/frontend/features/workspaces/workspace-status.js",
  controller: "src/frontend/features/workspaces/workspace-controller.js"
};
const periods = {
  view: "src/frontend/features/periods/period-view.js",
  form: "src/frontend/features/periods/period-form-adapter.js",
  controller: "src/frontend/features/periods/period-controller.js"
};

test("Workspace Feature trennt Repository, Snapshot, View, Status und Workflow", () => {
  Object.values(workspace).forEach(rel => assert.equal(fs.existsSync(path.join(ROOT, rel)), true, rel));
  const controller = read(workspace.controller);
  assert.ok(controller.split(/\r?\n/).length < 230);
  assert.doesNotMatch(controller, /localStorage/);
  assert.doesNotMatch(controller, /\.innerHTML\s*=/);
  assert.doesNotMatch(controller, /\bupsertWorkspace\s*\(/);
  assert.doesNotMatch(controller, /\bremoveWorkspace\s*\(/);
  assert.match(controller, /WORKSPACE_REPOSITORY\.save\(/);
  assert.match(controller, /WORKSPACE_REPOSITORY\.remove\(/);
  assert.match(read(workspace.repository), /BACKEND_CLIENT\.workspaceStorage/);
  assert.match(read(workspace.snapshot), /function collectWorkspaceSnapshot\(/);
  assert.match(read(workspace.view), /function renderWorkspaceOptions\(/);
  assert.match(read(workspace.status), /function setDirtyState\(/);
});

test("Browser Persistenz für Arbeitsstände liegt vollständig hinter der Backend API", () => {
  const frontendRuntimeFiles = manifest.module_order.map(rel => `src/${rel}`);
  const frontendWithStorage = frontendRuntimeFiles.filter(rel => /\blocalStorage\b/.test(read(rel)));
  assert.deepEqual(frontendWithStorage, []);

  const adapter = read(workspace.repository);
  assert.match(adapter, /BACKEND_CLIENT\.workspaceStorage/);
  assert.doesNotMatch(adapter, /localStorage|sessionStorage|document\./);

  const backendStorage = read("src/backend/infrastructure/storage/workspace-storage.mjs");
  assert.match(backendStorage, /export function createWorkspaceStorageRepository\(/);
  assert.doesNotMatch(backendStorage, /document\.|\balert\s*\(|\bconfirm\s*\(|\.innerHTML\s*=/);

  const backendEntry = read("src/backend/backend-entry.mjs");
  assert.match(backendEntry, /workspaceStorage:\s*browserWorkspaceStorage/);
  assert.match(backendEntry, /globalThis\.localStorage/);
});

test("Workspace Darstellung kennt keine Browser Persistenz", () => {
  const text = read(workspace.view);
  assert.doesNotMatch(text, /localStorage/);
  assert.doesNotMatch(text, /WORKSPACE_REPOSITORY/);
  assert.match(text, /function workspaceCardMarkup\(/);
  assert.match(text, /function renderWorkspaceCards\(/);
});

test("Zeitperioden trennen View, Formularadapter und Workflow", () => {
  Object.values(periods).forEach(rel => assert.equal(fs.existsSync(path.join(ROOT, rel)), true, rel));
  const controller = read(periods.controller);
  assert.ok(controller.split(/\r?\n/).length < 140);
  assert.doesNotMatch(controller, /function captureEkvFormState\(/);
  assert.doesNotMatch(controller, /function renderSavedPeriods\(/);
  assert.match(read(periods.view), /function renderSavedPeriods\(/);
  assert.match(read(periods.form), /function captureEkvFormState\(/);
  assert.match(read(periods.form), /function restoreEkvFormState\(/);
  assert.match(controller, /function saveCurrentPeriod\(/);
});

test("Build Manifest inventarisiert die getrennten Persistenzmodule genau einmal", () => {
  const order = manifest.module_order;
  const periodOrder = [
    "frontend/features/periods/period-view.js",
    "frontend/features/periods/period-form-adapter.js",
    "frontend/features/periods/period-controller.js"
  ];
  const workspaceOrder = [
    "frontend/features/workspaces/workspace-status.js",
    "frontend/features/workspaces/workspace-repository.js",
    "frontend/features/workspaces/workspace-snapshot.js",
    "frontend/features/workspaces/workspace-view.js",
    "frontend/features/workspaces/workspace-controller.js"
  ];
  for (const group of [periodOrder, workspaceOrder]) {
    group.forEach(rel => assert.equal(order.filter(item => item === rel).length, 1, rel));
  }
});
