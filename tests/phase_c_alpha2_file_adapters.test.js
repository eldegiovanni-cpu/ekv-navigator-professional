"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path"); const os=require("node:os"); const {execFileSync,spawnSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,".."); const DOMAIN=require("../generated/cjs/domain.cjs"); const FIX=path.join(ROOT,"tests","fixtures","bfs","files");

test("Phase C Alpha 2 besitzt XLSX CSV Adapter und File Dry Run",()=>{
 ["src/backend/data/bfs/adapters/tabular-file-adapter.mjs","scripts/bfs_extract_table.py","scripts/bfs_file_import.js"].forEach(rel=>assert.equal(fs.existsSync(path.join(ROOT,rel)),true,rel));
});

test("deutsche BFS Spaltenbezeichnungen werden auf kanonische Felder erkannt",()=>{
 assert.equal(DOMAIN.fieldForHeader("Wirtschaftsabteilung / NOGA"),"branch");
 assert.equal(DOMAIN.fieldForHeader("Betriebsübliche Wochenarbeitszeit"),"hours");
 assert.equal(DOMAIN.fieldForHeader("Kompetenzniveau"),"skill");
 assert.equal(DOMAIN.fieldForHeader("Standardisierter Monatslohn"),"value");
});

test("BUA breite Jahresmatrix wird ohne manuelles Umbenennen in Long Rows überführt",()=>{
 const matrix=[["Titel","",""],["NOGA / Wirtschaftsabteilung","2028","2029"],["49 Ganz neue BFS Benennung","41,3","41,4"]];
 const a=DOMAIN.adaptBfsTable({dataset:"BUA",matrix,source:{sourceFile:"bua.xlsx"},sheetName:"Tabelle1"});
 assert.equal(a.status,"ready"); assert.equal(a.detectedProfile,"bua-wide-years"); assert.equal(a.rows.length,2); assert.deepEqual(a.rows[0],{branch:"49 Ganz neue BFS Benennung",year:"2028",hours:"41,3"});
});

test("NLI breite Jahr Geschlecht Matrix wird automatisch erkannt",()=>{
 const matrix=[["NOGA / Wirtschaftsabteilung","Männer 2028","Frauen 2028","Total 2028"],["49 Test",103.2,103.8,103.5]];
 const a=DOMAIN.adaptBfsTable({dataset:"NLI",matrix}); assert.equal(a.status,"ready"); assert.equal(a.detectedProfile,"nli-wide-year-gender"); assert.deepEqual(a.rows.map(r=>r.gender),["Mann","Frau","Neutral"]);
});

test("LSE TA01 Long Table erkennt deutsche Originalspalten",()=>{
 const matrix=[["Jahr","Wirtschaftszweig","Kompetenzniveau","Geschlecht","Median"],[2028,"49 Test","1+2","Männer",7000]];
 const a=DOMAIN.adaptBfsTable({dataset:"LSE_TA01",matrix}); assert.equal(a.status,"ready"); assert.equal(a.detectedProfile,"long-table"); assert.equal(a.rows[0].value,7000);
});

test("XLSX Extraktor liest Tabellenblatt dependency free",()=>{
 const out=execFileSync("python",[path.join(ROOT,"scripts","bfs_extract_table.py"),path.join(FIX,"bua-wide.xlsx")],{encoding:"utf8"}); const x=JSON.parse(out); assert.equal(x.format,"xlsx"); assert.equal(x.sheetName,"BUA 2028"); assert.equal(x.matrix[1][0],"NOGA / Wirtschaftsabteilung"); assert.equal(x.matrix[2][1],"41,3");
});

test("CSV Extraktor erkennt Semikolon und UTF 8",()=>{
 const out=execFileSync("python",[path.join(ROOT,"scripts","bfs_extract_table.py"),path.join(FIX,"nli-long.csv")],{encoding:"utf8"}); const x=JSON.parse(out); assert.equal(x.format,"csv"); assert.equal(x.delimiter,";"); assert.equal(x.matrix[1][0],"Männer");
});

test("File Dry Run verarbeitet originale XLSX bis Candidate ohne Produktionsdaten zu verändern",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-bfs-file-")); const base=path.join(ROOT,"src","backend","data","base-data.json"); const before=fs.readFileSync(base,"utf8"); const out=execFileSync(process.execPath,[path.join(ROOT,"scripts","bfs_file_import.js"),"--input",path.join(FIX,"bua-wide.xlsx"),"--dataset","BUA","--out-dir",tmp],{cwd:ROOT,encoding:"utf8"}); const s=JSON.parse(out); assert.equal(s.status,"ready"); assert.equal(s.profile,"bua-wide-years"); Object.values(s.files).forEach(f=>assert.equal(fs.existsSync(f),true)); assert.equal(fs.readFileSync(base,"utf8"),before);
});

test("NLI CSV File Dry Run unterstützt abweichende Branchenbenennung",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-bfs-nli-")); const out=execFileSync(process.execPath,[path.join(ROOT,"scripts","bfs_file_import.js"),"--input",path.join(FIX,"nli-long.csv"),"--dataset","NLI","--out-dir",tmp],{cwd:ROOT,encoding:"utf8"}); const s=JSON.parse(out); assert.equal(s.status,"ready"); assert.equal(s.profile,"long-table");
});

test("nicht erkennbare Tabelle wird als Review blockiert statt geraten",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ekv-bfs-review-")); const r=spawnSync(process.execPath,[path.join(ROOT,"scripts","bfs_file_import.js"),"--input",path.join(FIX,"unknown.csv"),"--dataset","BUA","--out-dir",tmp],{cwd:ROOT,encoding:"utf8"}); assert.equal(r.status,2); const s=JSON.parse(r.stdout); assert.equal(s.status,"review"); assert.ok(s.issues.length>0);
});
