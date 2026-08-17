"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {execFileSync,spawnSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const json=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),"utf8"));
const read=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");

test("24 kritische Kernfaelle besitzen automatisch erzeugte Einzeldossiers",()=>{
  const risk=json("governance/golden-case-risk-v1.json");
  const core=risk.cases.filter(x=>x.core);
  assert.equal(core.length,24);
  for(const c of core){
    const d=json(`docs/core-certification/${c.id}.json`);
    assert.equal(d.caseId,c.id);
    assert.equal(d.risk,"critical");
    assert.equal(d.core,true);
    assert.match(d.dossierFingerprint,/^[a-f0-9]{64}$/);
  }
});

test("alle Kernfalldossiers bestehen technisch und sind nach BFS Datenrevision vollständig fachlich freigegeben",()=>{
  const reg=json("docs/CORE_CASE_CERTIFICATION_REGISTER_PHASE_D_ALPHA3.json");
  assert.equal(reg.coreCaseCount,24);
  assert.equal(reg.technicalPassed,24);
  assert.equal(reg.technicalFailed,0);
  assert.equal(reg.humanCertified,24);
  assert.equal(reg.humanPending,0);
  assert.equal(reg.humanRejected,0);
  assert.ok(reg.cases.every(x=>x.technicalStatus==="passed"));
  assert.ok(reg.cases.every(x=>x.humanStatus==="human-certified"));
});

test("Dossiers trennen technische Verifikation von menschlicher Fachzertifizierung",()=>{
  const d=json("docs/core-certification/INV-2024-050.json");
  assert.equal(d.technicalVerification.status,"passed");
  assert.equal(d.humanCertification.status,"human-certified");
  assert.match(d.rule.implementation,/calculateInvalidStatisticalIncome/);
  assert.equal(d.rule.referenceBasis.appVersion,"2.1.0");
});

test("Zertifizierungsschema verlangt menschliche Freigabe und Dossier Fingerprint",()=>{
  const schema=json("governance/core-case-certification.schema.json");
  assert.equal(schema.properties.reviewedBy.properties.actorType.const,"human");
  assert.ok(schema.required.includes("dossierFingerprint"));
  assert.ok(schema.required.includes("ruleAssessment"));
  assert.ok(schema.required.includes("resultAssessment"));
});

test("ohne menschliche Freigaben meldet der Status 24 offene Kernfaelle aber blockiert technischen Candidate nicht",()=>{
  const empty=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-cert-empty-"));
  const out=execFileSync(process.execPath,[path.join(ROOT,"scripts/core_certification_check.js")],{cwd:ROOT,encoding:"utf8",env:{...process.env,EKV_CERT_DIR:empty}});
  const r=JSON.parse(out);
  assert.equal(r.status,"pending-human-certification");
  assert.equal(r.humanPending,24);
  assert.equal(r.humanCertified,0);
  assert.equal(r.technicalPassed,24);
});

test("strikter Fachzertifizierungs Gate blockiert solange menschliche Freigaben fehlen",()=>{
  const empty=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-cert-strict-empty-"));
  const r=spawnSync(process.execPath,[path.join(ROOT,"scripts/core_certification_check.js"),"--require-all-approved"],{cwd:ROOT,encoding:"utf8",env:{...process.env,EKV_CERT_DIR:empty}});
  assert.notEqual(r.status,0);
  const body=JSON.parse(r.stdout);
  assert.equal(body.status,"pending-human-certification");
  assert.equal(body.humanPending,24);
});

test("KI Zertifizierung wird durch den Zertifizierungsvertrag ungueltig",()=>{
  const script=read("scripts/core_certification_check.js");
  assert.match(script,/actorType!=="human"/);
  const tpl=json("governance/certifications/TEMPLATE.json");
  assert.equal(tpl.reviewedBy.actorType,"human");
});

test("Package bindet technische Dossiererzeugung und separaten menschlichen Release Gate ein",()=>{
  const pkg=json("package.json");
  assert.ok(pkg.scripts["core:certification-report"]);
  assert.ok(pkg.scripts["core:certification-status"]);
  assert.ok(pkg.scripts["core:certification-release-gate"]);
  assert.match(pkg.scripts["test:governance"],/phase_d_alpha3_certification/);
});
