export function computeSplitBoxProgress(group: {
  targetCount: number;
  reservedCount: number;
  claimedCount: number;
}) {
  const total = group.targetCount;
  const filled = group.reservedCount + group.claimedCount;
  const percent = total ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percent };
}
