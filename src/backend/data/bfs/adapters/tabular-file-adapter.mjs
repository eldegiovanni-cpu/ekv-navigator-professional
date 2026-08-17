/* Phase C Alpha 3: profilgesteuerter Adapter fuer originale BFS Tabellen. */
import { createBfsRawPackage, BFS_DATASET_DEFINITIONS } from "../pipeline/contracts.mjs";
import { BFS_FIELD_ALIASES, getBfsProfiles } from "../profiles/profile-library.mjs";
import { createCellProvenance } from "../provenance/provenance.mjs";

const FIELD_ALIASES = BFS_FIELD_ALIASES;

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-CH")
    .replace(/[–—]/g, "-")
    .replace(/[%()\[\].,:;/\\]/g, " ")
    .replace(/\s+/g, " ").trim();
}
function fieldForHeader(value) {
  const h = normalizeHeader(value);
  if (!h) return null;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some(a => h === a || h.includes(a))) return field;
  }
  return null;
}
function yearFromHeader(value) {
  const m = String(value ?? "").match(/(?:19|20|21)\d{2}/);
  return m ? m[0] : null;
}
function genderFromHeader(value) {
  const h=normalizeHeader(value);
  if (/\b(mann|manner|maenner|m)\b/.test(h)) return "Mann";
  if (/\b(frau|frauen|f)\b/.test(h)) return "Frau";
  if (/\b(total|gesamt|beide|neutral)\b/.test(h)) return "Neutral";
  return null;
}
function skillFromHeader(value) {
  const h = normalizeHeader(value).replace(/kompetenzniveau|anforderungsniveau|niveau/g, " ");
  const combined = h.match(/\b(1\s*\+\s*2|3\s*\+\s*4)\b/);
  if (combined) return combined[1].replace(/\s+/g, "");
  const single = h.match(/(?:^|\s)([1-4])(?:\s|$)/);
  return single ? single[1] : null;
}
function scoreHeaderRow(row, requiredFields) {
  const found=new Set(row.map(fieldForHeader).filter(Boolean));
  let score=0; requiredFields.forEach(f=>{ if(found.has(f)) score+=3; });
  row.forEach(v=>{ if(yearFromHeader(v)) score+=1; });
  if(found.has("branch") || found.has("education")) score+=2;
  return score;
}
function combineHeaderRows(matrix, start, end) {
  const width=Math.max(...matrix.slice(start,end+1).map(r=>r?.length||0),0);
  return Array.from({length:width},(_,c)=>{
    const parts=[];
    for(let r=start;r<=end;r+=1){ const v=String(matrix[r]?.[c]??"").trim(); if(v && !parts.includes(v)) parts.push(v); }
    return parts.join(" ");
  });
}
function requiredHeaderFields(profile, dataset) {
  if (profile.layout === "long") return profile.requiredFields || BFS_DATASET_DEFINITIONS[dataset]?.requiredFields || [];
  return [profile.categoryField].filter(Boolean);
}
function detectHeaderRow(matrix, dataset, profile = null) {
  const required = requiredHeaderFields(profile || {layout:"long"}, dataset);
  let best={index:-1,start:-1,span:1,score:-1,headers:[]};
  const max=Math.min(matrix.length,30);
  for(let end=0;end<max;end+=1){
    for(let span=1;span<=3;span+=1){
      const start=end-span+1; if(start<0) continue;
      const headers=combineHeaderRows(matrix,start,end);
      let score=scoreHeaderRow(headers, required) - ((span-1)*2);
      if (profile?.layout === "wide-years") score += headers.filter(yearFromHeader).length * 2;
      if (profile?.layout === "wide-dimensions") {
        score += headers.filter(h => yearFromHeader(h)).length;
        if ((profile.dimensions||[]).includes("gender")) score += headers.filter(h => genderFromHeader(h)).length;
        if ((profile.dimensions||[]).includes("skill")) score += headers.filter(h => skillFromHeader(h)).length;
      }
      if(score>best.score) best={index:end,start,span,score,headers};
    }
  }
  return best;
}
function nonEmptyRows(matrix, startIndex) {
  return matrix.map((r,index)=>({r,index})).slice(startIndex).filter(({r})=>Array.isArray(r)&&r.some(v=>String(v??"").trim()!==""));
}
function withProvenance(row, args) {
  return { ...row, __provenance: createCellProvenance(args) };
}
function mapLongFormat(matrix, headerIndex, profile, source, sheetName) {
  const def=BFS_DATASET_DEFINITIONS[profile.dataset];
  const headers=matrix[headerIndex]||[];
  const mapping={};
  headers.forEach((h,i)=>{ const f=fieldForHeader(h); if(f && mapping[f]===undefined) mapping[f]=i; });
  const required=profile.requiredFields || def.requiredFields;
  const missing=required.filter(f=>mapping[f]===undefined);
  if(missing.length) return {matched:false, reason:`Pflichtspalten nicht erkannt: ${missing.join(", ")}`, rows:[], mapping};
  const valueColumn=mapping[def.valueField]; const categoryColumn=mapping[def.categoryField];
  const rows=nonEmptyRows(matrix,headerIndex+1).map(({r,index})=>{
    const out={}; Object.entries(mapping).forEach(([field,idx])=>{ out[field]=r[idx]; });
    return withProvenance(out,{source,sheetName,rawRow:index+1,rawColumn:valueColumn,categoryColumn,profile});
  });
  return {matched:true,rows,mapping};
}
function mapWideYears(matrix, headerIndex, profile, source, sheetName) {
  const headers=matrix[headerIndex]||[];
  const categoryIndex=headers.findIndex(h=>fieldForHeader(h)===profile.categoryField);
  const yearCols=headers.map((h,i)=>({i,year:yearFromHeader(h)})).filter(x=>x.year);
  if(categoryIndex<0 || !yearCols.length) return {matched:false,reason:"Matrixprofil benötigt eine Kategorie/NOGA Spalte und mindestens eine Jahresspalte.",rows:[]};
  const rows=[];
  nonEmptyRows(matrix,headerIndex+1).forEach(({r,index})=>{
    const category=r?.[categoryIndex]; if(String(category??"").trim()==="") return;
    yearCols.forEach(({i,year})=>{ const value=r?.[i]; if(String(value??"").trim()!=="") rows.push(withProvenance({[profile.categoryField]:category,year,[profile.valueField]:value},{source,sheetName,rawRow:index+1,rawColumn:i,categoryColumn:categoryIndex,profile})); });
  });
  return {matched:true,rows,mapping:{[profile.categoryField]:categoryIndex,years:yearCols}};
}
function dimensionsFromHeader(value, dimensions) {
  const out={};
  if(dimensions.includes("year")) out.year=yearFromHeader(value);
  if(dimensions.includes("gender")) out.gender=genderFromHeader(value);
  if(dimensions.includes("skill")) out.skill=skillFromHeader(value);
  return out;
}
function mapWideDimensions(matrix, headerIndex, profile, source, sheetName) {
  const headers=matrix[headerIndex]||[];
  const categoryIndex=headers.findIndex(h=>fieldForHeader(h)===profile.categoryField);
  const valueCols=headers.map((h,i)=>({i,...dimensionsFromHeader(h,profile.dimensions||[])})).filter(col=>(profile.dimensions||[]).every(dim=>col[dim]));
  if(categoryIndex<0 || !valueCols.length) return {matched:false,reason:`${profile.id} benötigt ${profile.categoryField} sowie kombinierte ${profile.dimensions.join("/")} Wertspalten.`,rows:[]};
  const rows=[];
  nonEmptyRows(matrix,headerIndex+1).forEach(({r,index})=>{
    const category=r?.[categoryIndex]; if(String(category??"").trim()==="") return;
    valueCols.forEach(col=>{
      const value=r?.[col.i]; if(String(value??"").trim()==="") return;
      const row={ [profile.categoryField]:category, [profile.valueField]:value };
      profile.dimensions.forEach(dim=>{ row[dim]=col[dim]; });
      rows.push(withProvenance(row,{source,sheetName,rawRow:index+1,rawColumn:col.i,categoryColumn:categoryIndex,profile}));
    });
  });
  return {matched:true,rows,mapping:{[profile.categoryField]:categoryIndex,values:valueCols}};
}
function mapWithProfile(matrix, header, profile, source, sheetName) {
  const synthetic=matrix.map(r=>Array.isArray(r)?[...r]:[]); synthetic[header.index]=header.headers;
  if(profile.layout==="long") return mapLongFormat(synthetic,header.index,profile,source,sheetName);
  if(profile.layout==="wide-years") return mapWideYears(synthetic,header.index,profile,source,sheetName);
  if(profile.layout==="wide-dimensions") return mapWideDimensions(synthetic,header.index,profile,source,sheetName);
  return {matched:false,reason:`Unbekanntes Profillayout: ${profile.layout}`,rows:[]};
}
function legacyProfileName(profile) {
  if(profile.layout==="long") return "long-table";
  if(profile.id==="bua-wide-years-v1") return "bua-wide-years";
  if(profile.id==="nli-wide-year-gender-v1") return "nli-wide-year-gender";
  return profile.id;
}
function inspectBfsTable({ dataset, matrix, source={}, sheetName="" }={}) {
  if (!BFS_DATASET_DEFINITIONS[dataset]) return {status:"invalid",issues:[`Unbekannter Datensatztyp: ${dataset}`],candidates:[]};
  if (!Array.isArray(matrix) || !matrix.length) return {status:"invalid",issues:["Datei enthält keine Tabellenwerte."],candidates:[]};
  const candidates=getBfsProfiles(dataset).map(profile=>{
    const header=detectHeaderRow(matrix,dataset,profile);
    if(header.index<0) return {profile,header,matched:false,score:-1,reason:"Keine geeignete Kopfzeile erkannt."};
    const mapped=mapWithProfile(matrix,header,profile,source,sheetName);
    const score=header.score + (mapped.matched ? profile.priority + Math.min(mapped.rows.length,50) : 0);
    return {profile,header,...mapped,score};
  }).sort((a,b)=>b.score-a.score || b.profile.priority-a.profile.priority || a.profile.id.localeCompare(b.profile.id));
  const ready=candidates.filter(c=>c.matched && c.rows.length);
  if(!ready.length) return {status:"review",issues:[candidates[0]?.reason||"Kein passendes BFS Profil erkannt."],candidates};
  const best=ready[0];
  const sameScore=ready.filter(c=>c.score===best.score && c.profile.id!==best.profile.id);
  if(sameScore.length) return {status:"review",issues:[`Mehrdeutige Profilzuordnung: ${[best,...sameScore].map(c=>c.profile.id).join(", ")}`],candidates};
  return {status:"ready",issues:[],best,candidates};
}
function adaptBfsTable({ dataset, matrix, source={}, sheetName="" }={}) {
  const inspection=inspectBfsTable({dataset,matrix,source,sheetName});
  if(inspection.status!=="ready") return {status:inspection.status,issues:inspection.issues,detectedProfile:null,profileId:null,profileVersion:null,profileScore:null,candidates:inspection.candidates||[],rows:[]};
  const best=inspection.best; const pkg=createBfsRawPackage({dataset,source:{...source,sheetName,profileId:best.profile.id,profileVersion:best.profile.version},rows:best.rows});
  const publicRows=best.rows.map(row=>{ const { __provenance, ...clean } = row; return clean; });
  return {status:"ready",issues:[],headerRow:best.header.index+1,headerSpan:best.header.span,detectedProfile:legacyProfileName(best.profile),profileId:best.profile.id,profileVersion:best.profile.version,profileScore:best.score,columnMapping:best.mapping,rows:publicRows,pkg,candidates:inspection.candidates};
}
export { FIELD_ALIASES, adaptBfsTable, detectHeaderRow, fieldForHeader, genderFromHeader, inspectBfsTable, normalizeHeader, skillFromHeader, yearFromHeader };
