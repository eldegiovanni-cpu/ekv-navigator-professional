"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const crypto=require("node:crypto");
const {spawnSync,execFileSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");
const json=rel=>JSON.parse(read(rel));
const sha=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function run(args){return spawnSync(process.execPath,[path.join(ROOT,"scripts/golden_approval_check.js"),...args],{cwd:ROOT,encoding:"utf8"});}

test("alle Golden Cases besitzen eine Risikoklassifizierung",()=>{
  const suite=json("tests/golden/golden_cases_v1.json");
  const risk=json("governance/golden-case-risk-v1.json");
  assert.equal(risk.cases.length,suite.cases.length);
  assert.deepEqual([...risk.cases.map(x=>x.id)].sort(),[...suite.cases.map(x=>x.id)].sort());
  for(const item of risk.cases) assert.ok(["critical","high","medium","standard"].includes(item.risk),item.id);
});

test("24 fachliche Kernfaelle sind kritisch markiert",()=>{
  const risk=json("governance/golden-case-risk-v1.json");
  const critical=risk.cases.filter(x=>x.risk==="critical");
  assert.equal(risk.coreCaseCount,24);
  assert.equal(critical.length,24);
  for(const id of ["INV-2024-050","INV-2024-051","INV-2023-050","VAL-76000","VAL-100K-95K","EKV-80-90","MIX-40-80-20-25","ROW-P50-IDX","BASE-TA01-2024-M-ALL-1","BASE-T17-2024-M-FUEHRUNG","BASE-TA11-2024-F-UNI-12"]) assert.ok(critical.some(x=>x.id===id),id);
});

test("Golden Lock enthaelt Fingerprints fuer alle 78 Cases",()=>{
  const suite=json("tests/golden/golden_cases_v1.json");
  const lock=json("governance/golden-cases.lock.json");
  assert.equal(Object.keys(lock.caseFingerprints).length,78);
  assert.equal(lock.coreCaseCount,24);
  assert.equal(lock.caseCount,suite.cases.length);
  assert.equal(lock.sha256,sha(path.join(ROOT,lock.file)));
});

test("unveraenderte Golden Baseline benoetigt keinen Approval Record",()=>{
  const output=execFileSync(process.execPath,[path.join(ROOT,"scripts/golden_approval_check.js")],{cwd:ROOT,encoding:"utf8"});
  const result=JSON.parse(output);
  assert.equal(result.status,"locked");
  assert.equal(result.approvalRequired,false);
  assert.equal(result.coreCaseCount,24);
});

test("veraenderter Golden Case ohne Approval wird blockiert und als kritisch erkannt",()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-golden-"));
  const suite=json("tests/golden/golden_cases_v1.json");
  suite.cases.find(x=>x.id==="INV-2024-050").expected.finalValue+=1;
  const golden=path.join(tmp,"golden.json"); fs.writeFileSync(golden,JSON.stringify(suite,null,2));
  const approvals=path.join(tmp,"approvals");fs.mkdirSync(approvals);
  const r=run(["--golden",golden,"--approvals",approvals]);
  assert.notEqual(r.status,0);
  const result=JSON.parse(r.stdout);
  assert.equal(result.status,"blocked");
  assert.deepEqual(result.changedCaseIds,["INV-2024-050"]);
  assert.deepEqual(result.criticalChangedCaseIds,["INV-2024-050"]);
});

test("KI darf einen Golden Case nicht selbst freigeben",()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-golden-ai-"));
  const suite=json("tests/golden/golden_cases_v1.json");suite.cases.find(x=>x.id==="EKV-80-90").expected.grade=1;
  const golden=path.join(tmp,"golden.json");fs.writeFileSync(golden,JSON.stringify(suite,null,2));
  const approvals=path.join(tmp,"approvals");fs.mkdirSync(approvals);
  const lock=json("governance/golden-cases.lock.json");
  const approval={schemaVersion:1,approvalId:"AI-1",suiteId:lock.suiteId,changeType:"domain-rule-change",status:"approved",previousSha256:lock.sha256,proposedSha256:sha(golden),affectedCaseIds:["EKV-80-90"],rationale:"Explizite Aenderung der Fachregel aufgrund einer dokumentierten neuen Vorgabe.",businessRuleReference:{description:"Neue Fachregel",sourceReference:"Fachweisung Test"},approvedBy:{name:"KI Agent",role:"Assistant",actorType:"ai"},approvedAt:"2026-08-15T20:00:00Z",evidence:["Testnachweis"]};
  fs.writeFileSync(path.join(approvals,"ai.json"),JSON.stringify(approval,null,2));
  const r=run(["--golden",golden,"--approvals",approvals]);
  assert.notEqual(r.status,0);const result=JSON.parse(r.stdout);assert.match(result.evaluatedApprovals[0].errors.join(" "),/human/);
});

test("gueltige menschliche Freigabe deckt exakt geaenderte Case IDs ab",()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-golden-human-"));
  const suite=json("tests/golden/golden_cases_v1.json");suite.cases.find(x=>x.id==="EKV-80-90").expected.grade=1;
  const golden=path.join(tmp,"golden.json");fs.writeFileSync(golden,JSON.stringify(suite,null,2));
  const approvals=path.join(tmp,"approvals");fs.mkdirSync(approvals);
  const lock=json("governance/golden-cases.lock.json");
  const approval={schemaVersion:1,approvalId:"HUMAN-1",suiteId:lock.suiteId,changeType:"domain-rule-change",status:"approved",previousSha256:lock.sha256,proposedSha256:sha(golden),affectedCaseIds:["EKV-80-90"],rationale:"Explizite fachliche Neuregelung mit dokumentierter Auswirkung auf diesen Referenzfall.",businessRuleReference:{description:"Neue Fachregel",sourceReference:"Fachweisung Test"},approvedBy:{name:"Fachverantwortung Test",role:"Fachfreigabe",actorType:"human"},approvedAt:"2026-08-15T20:00:00Z",evidence:["Vier-Augen-Pruefung","Regressionstest"]};
  fs.writeFileSync(path.join(approvals,"human.json"),JSON.stringify(approval,null,2));
  const r=run(["--golden",golden,"--approvals",approvals]);
  assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout);assert.equal(result.status,"approved-change");assert.equal(result.approval.approvalId,"HUMAN-1");
});

test("Package und Candidate Gate binden Approval Check verbindlich ein",()=>{
  const pkg=json("package.json");const gate=read("scripts/candidate_gate.js");
  assert.ok(pkg.scripts["golden:approval-check"]);
  const policy=json("governance/ai-change-policy.json"); assert.equal(policy.changeTypes["domain-rule-change"].approvalRecordRequired,true);
  assert.match(pkg.scripts["test:governance"],/phase_d_alpha2_approval/);
  assert.match(gate,/golden:approval-check/);
});
