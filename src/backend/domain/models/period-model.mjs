export function comparablePeriodEnd(value) { return value || "9999-12-31"; }
export function periodsOverlap(startA, endA, startB, endB) {
  if (!startA || !startB) return false;
  return startA <= comparablePeriodEnd(endB) && startB <= comparablePeriodEnd(endA);
}
export function findPeriodOverlaps(periods, candidate, ignoreId = null) {
  return (periods || []).filter(period => {
    if (ignoreId && period?.id === ignoreId) return false;
    return periodsOverlap(period?.periodeVon, period?.periodeBis, candidate?.periodeVon, candidate?.periodeBis);
  });
}
export function movePeriod(periods, id, direction) {
  const copy = [...(periods || [])];
  const index = copy.findIndex(period => period?.id === id);
  const nextIndex = index + Number(direction || 0);
  if (index < 0 || nextIndex < 0 || nextIndex >= copy.length) return copy;
  [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  return copy;
}
