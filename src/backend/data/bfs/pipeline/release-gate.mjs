function evaluateBfsReleaseGate(importResults = []) {
  const blockers = [];
  const datasets = [];
  importResults.forEach(result => {
    const audit = result?.audit;
    if (!audit) {
      blockers.push("Importresultat ohne Audit.");
      return;
    }
    datasets.push({ dataset: audit.dataset, status: audit.status, newValueCount: audit.newValueCount, acceptedRows: audit.acceptedRows });
    if (audit.status !== "ready") blockers.push(`${audit.dataset}: Importstatus ${audit.status}.`);
    if (audit.unresolvedCount) blockers.push(`${audit.dataset}: ${audit.unresolvedCount} ungeklärte Zuordnungen.`);
    if (audit.invalidRowCount) blockers.push(`${audit.dataset}: ${audit.invalidRowCount} ungültige Zeilen.`);
    if (audit.collisionCount) blockers.push(`${audit.dataset}: ${audit.collisionCount} Kollisionen innerhalb der Lieferung.`);
    if (audit.existingValueConflictCount) blockers.push(`${audit.dataset}: ${audit.existingValueConflictCount} Konflikte mit bestehenden Werten.`);
  });
  return { status: blockers.length ? "blocked" : "ready", blockers, datasets };
}

export { evaluateBfsReleaseGate };
