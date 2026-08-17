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

function makeRecord(caseId,actorType="human",fingerprintOverride=null){
  const d=json(`docs/core-certification/${caseId}.json`);
  return {schemaVersion:1,certificationId:`CERT-${caseId}-TEST`,suiteId:d.suiteId,caseId,dossierFingerprint:fingerprintOverride||d.dossierFingerprint,status:"approved",ruleAssessment:"Die angewendete Fachregel wurde fachlich geprüft.",resultAssessment:"Das erwartete Ergebnis wurde fachlich geprüft.",sourceReference:"Interne Fachprüfung",reviewedBy:{name:"Test Fachperson",role:"Fachprüfung",actorType},reviewedAt:"2026-08-16T01:00:00+02:00",evidence:["Vier-Augen-Prüfung"],comments:"Testrecord"};
}
function makeBundle(record,actorType="human"){
  return {schemaVersion:1,bundleType:"human-certification-review",suiteId:"ekv-golden-cases-2.1-baseline",reviewToolVersion:"phase-d-alpha4",generatedAt:"2026-08-16T01:00:00+02:00",reviewer:{name:"Test Fachperson",role:"Fachprüfung",actorType},recordCount:1,totalCoreCases:24,records:[record]};
}

test("Fachpruefungswerkzeug wird aus allen 24 aktuellen Dossiers generiert",()=>{
  const out=execFileSync(process.execPath,[path.join(ROOT,"scripts/core_review_pack.js")],{cwd:ROOT,encoding:"utf8"});
  const r=JSON.parse(out);assert.equal(r.status,"ok");assert.equal(r.caseCount,24);assert.equal(r.technicalPassed,24);
  const html=read("dist-review/EKV-Kernfall-Fachpruefung.html");
  const m=html.match(/<script id="review-data" type="application\/json">([\s\S]*?)<\/script>/);assert.ok(m);
  const data=JSON.parse(m[1]);assert.equal(data.dossiers.length,24);assert.ok(data.dossiers.every(x=>x.technicalVerification.status==="passed"));
});

test("Review Tool trennt technische Pruefung und menschliche Entscheidung sichtbar",()=>{
  const html=read("dist-review/EKV-Kernfall-Fachpruefung.html");
  assert.match(html,/Fachliche Zertifizierung darf nur durch eine menschliche Fachperson erfolgen/);
  assert.match(html,/Fall fachlich genehmigen/);
  assert.match(html,/actorType:'human'/);
  assert.doesNotMatch(html,/status:'approved',ruleAssessment/);
});

test("Review Bundle Schema verlangt menschliche Reviewer Identitaet",()=>{
  const schema=json("governance/core-certification-bundle.schema.json");
  assert.equal(schema.properties.reviewer.properties.actorType.const,"human");
  assert.equal(schema.properties.totalCoreCases.const,24);
});

test("Bundle Dry Run validiert einen aktuellen menschlichen Zertifizierungsrecord ohne Source Mutation",()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-review-"));const f=path.join(temp,"bundle.json");
  const record=makeRecord("INV-2024-050");fs.writeFileSync(f,JSON.stringify(makeBundle(record),null,2));
  const dest=path.join(ROOT,"governance/certifications/INV-2024-050.json");
  const before=fs.readFileSync(dest,"utf8");
  const out=execFileSync(process.execPath,[path.join(ROOT,"scripts/core_review_bundle.js"),f,"--replace"],{cwd:ROOT,encoding:"utf8"});const r=JSON.parse(out);
  assert.equal(r.status,"ok");assert.equal(r.mode,"dry-run");assert.equal(r.recordCount,1);assert.equal(r.approved,1);assert.equal(fs.readFileSync(dest,"utf8"),before);
});

test("Bundle Import blockiert KI Reviewer",()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-review-ai-"));const f=path.join(temp,"bundle.json");const record=makeRecord("INV-2024-050","ai");fs.writeFileSync(f,JSON.stringify(makeBundle(record,"ai"),null,2));
  const r=spawnSync(process.execPath,[path.join(ROOT,"scripts/core_review_bundle.js"),f],{cwd:ROOT,encoding:"utf8"});assert.notEqual(r.status,0);const body=JSON.parse(r.stdout);assert.equal(body.status,"blocked");assert.match(body.details.join(" "),/actorType muss human/);
});

test("Bundle Import blockiert veraltete Dossier Fingerprints",()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-review-stale-"));const f=path.join(temp,"bundle.json");const record=makeRecord("INV-2024-050","human","0".repeat(64));fs.writeFileSync(f,JSON.stringify(makeBundle(record),null,2));
  const r=spawnSync(process.execPath,[path.join(ROOT,"scripts/core_review_bundle.js"),f],{cwd:ROOT,encoding:"utf8"});assert.notEqual(r.status,0);const body=JSON.parse(r.stdout);assert.equal(body.reason,"invalid-certification-records");assert.match(JSON.stringify(body),/dossierFingerprint ist veraltet oder falsch/);
});

test("Package bietet explizite Review Pack und Bundle Check Befehle",()=>{
  const pkg=json("package.json");assert.ok(pkg.scripts["core:review-pack"]);assert.ok(pkg.scripts["core:review-bundle-check"]);assert.ok(pkg.scripts["core:review-bundle-import"]);assert.match(pkg.scripts["test:governance"],/phase_d_alpha4_review_workflow/);
});
