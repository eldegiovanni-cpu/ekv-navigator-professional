"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));

test("Final Candidate besitzt 24 von 24 gültige menschliche Kernfallzertifizierungen",()=>{
  const reg=readJson("docs/CORE_CASE_CERTIFICATION_REGISTER_PHASE_D_ALPHA3.json");
  assert.equal(reg.technicalPassed,24);
  assert.equal(reg.humanCertified,24);
  assert.equal(reg.humanPending,0);
  assert.equal(reg.humanRejected,0);
});

test("strikter Fachzertifizierungs Gate ist fully-certified",()=>{
  const proc=spawnSync(process.execPath,[path.join(ROOT,"scripts","core_certification_check.js"),"--require-all-approved"],{cwd:ROOT,encoding:"utf8"});
  assert.equal(proc.status,0,proc.stdout+proc.stderr);
  const r=JSON.parse(proc.stdout);
  assert.equal(r.status,"fully-certified");
  assert.equal(r.technicalPassed,24);
  assert.equal(r.humanCertified,24);
  assert.equal(r.humanPending,0);
});

test("Review Bundle liegt getrennt von Einzelzertifikaten",()=>{
  assert.ok(fs.existsSync(path.join(ROOT,"governance","review-bundles","REVIEW_BUNDLE_2026-08-16.json")));
  assert.equal(fs.existsSync(path.join(ROOT,"governance","certifications","REVIEW_BUNDLE_2026-08-16.json")),false);
});
