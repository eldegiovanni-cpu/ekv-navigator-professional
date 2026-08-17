"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");

test("Commercial Final Master ist sichtbar und vertriebsbereit gekennzeichnet",()=>{
  const html=read("src/frontend/index.html");
  assert.match(html,/Professional 1\.0 Commercial Final/);
  assert.match(html,/EKVP-1-FINAL-MASTER-2026/);
  assert.match(html,/Commercial Final Master · vertriebsbereit/);
  assert.match(html,/De Giovanni InvaTech/);
  assert.match(html,/Bundesamt für Statistik BFS/);
  assert.match(html,/24 kritischen Kernfälle/);
  assert.doesNotMatch(html,/NOT-FOR-SALE/);
  assert.doesNotMatch(html,/Verkaufsfreigabe offen/);
});

test("Commercial Release Metadaten entsprechen Final Master",()=>{
  const r=JSON.parse(read("COMMERCIAL_RELEASE.json"));
  assert.equal(r.commercial_version,"1.0 Commercial Final Master");
  assert.equal(r.release_status,"COMMERCIAL_FINAL_MASTER_SALES_READY");
  assert.equal(r.feature_freeze,true);
  assert.equal(r.quality_baseline.core_cases_human_certified,"24/24");
  assert.equal(r.commercial_sale_gates.bfs_commercial_use_permissions,"CONFIRMED_WITH_SOURCE_ATTRIBUTION");
  assert.equal(r.provider.name,"De Giovanni InvaTech");
});
