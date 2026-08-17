"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);

test("Source besitzt physisch getrennte Frontend und Backend Wurzeln", () => {
  assert.equal(fs.existsSync(path.join(ROOT,"src/backend")), true);
  assert.equal(fs.existsSync(path.join(ROOT,"src/frontend")), true);
  ["src/domain","src/data","src/features","src/app","src/shared","src/styles"].forEach(rel => assert.equal(fs.existsSync(path.join(ROOT,rel)), false, rel));
});

test("Backend Browservertrag exportiert exakt eine öffentliche API", () => {
  const entry = read("src/backend/backend-entry.mjs");
  const exported = [...entry.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
  assert.deepEqual(exported,["EKV_BACKEND_API"]);
  assert.match(entry,/apiVersion:\s*"1\.0\.0"/);
});

test("Frontend greift nur über den zentralen Backend Client auf Browser Backend zu", () => {
  const files = walk(path.join(ROOT,"src/frontend")).filter(p=>p.endsWith(".js"));
  const direct = files.filter(p=>/window\.EKV_BACKEND_API/.test(fs.readFileSync(p,"utf8"))).map(p=>path.relative(ROOT,p).replaceAll("\\","/"));
  assert.deepEqual(direct,["src/frontend/backend/backend-client.js"]);
  for (const file of files) assert.doesNotMatch(fs.readFileSync(file,"utf8"), /(?:from|require\s*\()[^\n]*src\/backend|\.\.\/\.\.\/backend\//, path.relative(ROOT,file));
});

test("Backend Domain und Datenmodule enthalten keine Frontend oder DOM Abhängigkeiten", () => {
  const files = [...walk(path.join(ROOT,"src/backend/domain")), ...walk(path.join(ROOT,"src/backend/data/bfs"))].filter(p=>/\.(?:mjs|js)$/.test(p));
  for (const file of files) {
    const source=fs.readFileSync(file,"utf8");
    assert.doesNotMatch(source,/src\/frontend|frontend\/features|document\.|localStorage|sessionStorage/,path.relative(ROOT,file));
  }
});


test("Frontend besitzt keinen direkten Browser Persistenzzugriff", () => {
  const files = walk(path.join(ROOT,"src/frontend")).filter(p=>/\.(?:js|mjs)$/.test(p));
  for (const file of files) {
    const source=fs.readFileSync(file,"utf8");
    assert.doesNotMatch(source,/\blocalStorage\b|\bsessionStorage\b/,path.relative(ROOT,file));
  }

  const adapter=read("src/frontend/features/workspaces/workspace-repository.js");
  assert.match(adapter,/BACKEND_CLIENT\.workspaceStorage/);
  const storage=read("src/backend/infrastructure/storage/workspace-storage.mjs");
  assert.match(storage,/createWorkspaceStorageRepository/);
  assert.doesNotMatch(storage,/document\.|window\./);
});

test("Portable Build verwendet Daten Backend Frontend Reihenfolge", () => {
  const html=read("dist/index.html");
  const dataAt=html.indexOf('assets/data.bundle.js');
  const backendAt=html.indexOf('assets/backend.bundle.js');
  const frontendAt=html.indexOf('assets/frontend.bundle.js');
  assert.ok(dataAt>=0 && backendAt>dataAt && frontendAt>backendAt);
  assert.doesNotMatch(html,/assets\/domain\.bundle\.js|assets\/app\.bundle\.js/);
});

test("Backend Runtime verbirgt interne Funktionen und friert den Datenkatalog ein", () => {
  const base=JSON.parse(read("src/backend/data/base-data.json"));
  base.modes.TA11=JSON.parse(read("src/backend/data/ta11-data.json"));
  const sandbox={globalThis:null,__EKV_DATA__:base,__EKV_BRANCH_ALIASES__:JSON.parse(read("src/backend/data/branch-aliases.json"))};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("dist/assets/backend.bundle.js"),sandbox);
  const api=sandbox.EKV_BACKEND_API;
  assert.equal(typeof api.calculateEkvCase,"function");
  assert.equal(typeof sandbox.calculateEkvCase,"undefined");
  assert.equal(Object.isFrozen(api.catalog),true);
  assert.equal(Object.isFrozen(api.catalog.modes),true);
  assert.equal(Object.isFrozen(api.audit),true);
});

test("Backend API reproduziert den zertifizierten EKV Referenzfall", () => {
  const base=JSON.parse(read("src/backend/data/base-data.json"));
  base.modes.TA11=JSON.parse(read("src/backend/data/ta11-data.json"));
  const sandbox={globalThis:null,__EKV_DATA__:base,__EKV_BRANCH_ALIASES__:JSON.parse(read("src/backend/data/branch-aliases.json"))};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("dist/assets/backend.bundle.js"),sandbox);
  const result=sandbox.EKV_BACKEND_API.calculateEkvCase({validIncome:80000,invalidIncome:40000});
  assert.equal(result.grade,0.5);
  assert.equal(result.finalGrade,0.5);
});
