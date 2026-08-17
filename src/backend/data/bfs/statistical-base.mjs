import { calculateStatisticalAnnual } from "../../domain/calculations/calculations.mjs";
import { createBfsRepository } from "./repository.mjs";

function qualityNotice(label, meta) {
  if (!meta?.reason) return null;
  return `${label}: ${meta.reason}`;
}

function uniqueNotices(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function calculateStatisticalBase(data, { mode, year, gender, branch, skill }, aliases = { aliases: {} }) {
  const numericYear = Number(year);
  const repository = createBfsRepository({ data, aliases });
  const cfg = repository.getModeConfig(mode);
  const effectiveSkill = mode === "T17" ? "Alle" : skill;

  const salaryInfo = repository.getBaseSalaryInfo(mode, gender, branch, effectiveSkill, numericYear);
  const sourceYear = salaryInfo.sourceYear;
  const hoursInfo = repository.getWorkHoursStatInfo(mode, branch, numericYear);
  const baseIndexInfo = repository.getStatIndexInfo(mode, branch, gender, sourceYear);
  const targetIndexInfo = repository.getStatIndexInfo(mode, branch, gender, numericYear);

  const monthly = salaryInfo.value;
  const hours = hoursInfo.value;
  const baseIndex = baseIndexInfo.value;
  const targetIndex = targetIndexInfo.value;
  const annual = calculateStatisticalAnnual({ monthly, hours, baseIndex, targetIndex });

  const qualityNotices = uniqueNotices([
    qualityNotice("LSE Ausgangswert", salaryInfo.meta),
    qualityNotice("Betriebsübliche Arbeitszeit", hoursInfo.meta),
    qualityNotice("Nominallohnindex Basisjahr", baseIndexInfo.meta),
    qualityNotice("Nominallohnindex Zieljahr", targetIndexInfo.meta)
  ]);

  return {
    cfg,
    mode,
    year: numericYear,
    sourceYear,
    gender,
    branch,
    skill: effectiveSkill,
    monthly,
    hours,
    baseIndex,
    targetIndex,
    annual,
    qualityNotices,
    provenance: {
      salary: salaryInfo.meta || null,
      workHours: hoursInfo.meta || null,
      baseIndex: baseIndexInfo.meta || null,
      targetIndex: targetIndexInfo.meta || null
    }
  };
}
