import type { IdealSwapTarget } from '@/frontend/presentation/components/listing/IdealSwapTargetsSection';

const IDEAL_MARKER = '【理想交換】';

export function parseIdealSwapFromDescription(description: string): {
  idealTargets: IdealSwapTarget[];
  supplemental: string;
} {
  const idx = description.indexOf(IDEAL_MARKER);
  if (idx < 0) {
    return { idealTargets: [], supplemental: description.trim() };
  }

  const before = description.slice(0, idx).trim();
  const afterMarker = description.slice(idx + IDEAL_MARKER.length).replace(/^\n+/, '');
  const splitIdx = afterMarker.search(/\n\n/);
  const idealBlock = splitIdx >= 0 ? afterMarker.slice(0, splitIdx) : afterMarker;
  const afterIdeal = splitIdx >= 0 ? afterMarker.slice(splitIdx + 2).trim() : '';

  const idealTargets: IdealSwapTarget[] = [];
  for (const line of idealBlock.split('\n')) {
    const trimmed = line.trim();
    const match = trimmed.match(/^\d+\.\s*(.+?)\s*·\s*(.+?)\s*·\s*(.+?)\s*·\s*(.+)$/);
    if (!match) continue;
    idealTargets.push({
      catalogProductId: '',
      itemName: match[4].trim(),
      brand: match[1].trim(),
      brandSlug: '',
      ip: match[2].trim(),
      ipSlug: '',
      productLine: match[3].trim(),
    });
  }

  const supplemental = [before, afterIdeal].filter(Boolean).join('\n\n').trim();
  return { idealTargets, supplemental };
}

export function parseListingPriceAmount(price: string): string {
  const digits = price.replace(/[^\d]/g, '');
  return digits || '';
}
