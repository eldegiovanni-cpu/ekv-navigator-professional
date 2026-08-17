"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");
const json=rel=>JSON.parse(read(rel));

function walk(dir, ext=".mjs") {
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p,ext));
    else if(entry.name.endsWith(ext)) out.push(p);
  }
  return out;
}

test("Phase D besitzt verbindliche AI Governance Artefakte",()=>{
  for(const rel of ["AI_DEVELOPMENT_GUIDE.md","governance/ai-change-policy.json","governance/architecture-boundaries.json","governance/golden-cases.lock.json","governance/RELEASE_CHECKLISTS.md","governance/GOLDEN_CASE_POLICY.md"])
    assert.equal(fs.existsSync(path.join(ROOT,rel)),true,rel);
  const guide=read("AI_DEVELOPMENT_GUIDE.md");
  assert.match(guide,/Golden Cases duerfen niemals angepasst werden|Golden Cases dürfen niemals angepasst werden/);
  assert.match(guide,/unklare BFS Kategorien automatisch|unklare BFS Kategorien/);
  assert.match(guide,/Offlinefaehigkeit|Offlinefähigkeit/);
});

test("Change Policy trennt UI BFS Fachregel Workspace Export und Architektur",()=>{
  const policy=json("governance/ai-change-policy.json");
  for(const type of ["ui-only","bfs-data-update","domain-rule-change","workspace-change","export-change","architecture-refactor"]) assert.ok(policy.changeTypes[type],type);
  assert.equal(policy.changeTypes["domain-rule-change"].humanReviewRequired,true);
  assert.equal(policy.changeTypes["domain-rule-change"].goldenCaseChangeRequiresExplicitApproval,true);
  assert.ok(policy.protected.includes("tests/golden/"));
});

test("Change Scope Checker blockiert Fachkern bei UI Aenderung",()=>{
  let output="";
  try { output=execFileSync(process.execPath,[path.join(ROOT,"scripts/change_scope_check.js"),"--type","ui-only","--file","src/backend/domain/rules/ekv-rules.mjs"],{cwd:ROOT,encoding:"utf8"}); }
  catch(e){ output=e.stdout; }
  const result=JSON.parse(output);
  assert.equal(result.status,"blocked");
  assert.deepEqual(result.forbidden,["src/backend/domain/rules/ekv-rules.mjs"]);
});

test("Change Scope Checker erlaubt reine Style Aenderung ohne Human Review",()=>{
  const output=execFileSync(process.execPath,[path.join(ROOT,"scripts/change_scope_check.js"),"--type","ui-only","--file","src/frontend/styles/50-professional-components.css"],{cwd:ROOT,encoding:"utf8"});
  const result=JSON.parse(output);
  assert.equal(result.status,"ok");
  assert.deepEqual(result.allowed,["src/frontend/styles/50-professional-components.css"]);
});

test("Golden Case Dateien sind in der Change Policy geschuetzt",()=>{
  const output=execFileSync(process.execPath,[path.join(ROOT,"scripts/change_scope_check.js"),"--type","domain-rule-change","--file","tests/golden/golden_cases_v1.json"],{cwd:ROOT,encoding:"utf8"});
  const result=JSON.parse(output);
  assert.equal(result.status,"review");
  assert.equal(result.files[0].state,"review");
  assert.match(result.files[0].reason,/Freigabe/);
});

test("Domain Layer bleibt frei von Browser Storage und Feature Abhaengigkeiten",()=>{
  const files=walk(path.join(ROOT,"src/backend/domain"));
  assert.ok(files.length>=8);
  for(const file of files){
    const source=fs.readFileSync(file,"utf8");
    assert.doesNotMatch(source,/\b(?:window|document|localStorage|sessionStorage)\b/,path.relative(ROOT,file));
    assert.doesNotMatch(source,/from\s+["'][^"']*(?:features|\/app\/)/,path.relative(ROOT,file));
  }
});

test("BFS Data Layer importiert keine Feature oder App Module",()=>{
  const files=walk(path.join(ROOT,"src/backend/data/bfs"));
  for(const file of files){
    const source=fs.readFileSync(file,"utf8");
    assert.doesNotMatch(source,/from\s+["'][^"']*(?:features|\/app\/)/,path.relative(ROOT,file));
  }
});

test("Package bindet Governance und Golden Cases in den Standardtest ein",()=>{
  const pkg=json("package.json");
  assert.match(pkg.scripts.test,/test:governance/);
  assert.match(pkg.scripts.test,/test:golden/);
  assert.ok(pkg.scripts["candidate:gate"]);
});
