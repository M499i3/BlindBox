/** 產品線系列名：由商品標題推斷（與 backend/domain/series_rules.py 對齊） */

import seriesTitleRulesJson from '@/frontend/data/series-title-rules.json';

export const FALLBACK_SERIES = '未分系列';

const SERIES_SUFFIX_RE = /(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/;

/** 系列名前綴字元（含 , ! ? 等，避免 CHEER UP, BABY!系列 落入未分系列） */
export const SERIES_NAME_PATTERN =
  /([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）,!?&+#:%@'"]{2,48}?系列)/;

export type SeriesTitleRule = {
  seriesName: string;
  titleContains: string;
};

type RulesFile = {
  rules?: Array<{ seriesName?: string; titleContains?: string }>;
};

const TITLE_RULES: SeriesTitleRule[] = (
  (seriesTitleRulesJson as RulesFile).rules ?? []
)
  .map((r) => ({
    seriesName: String(r.seriesName ?? '').trim(),
    titleContains: String(r.titleContains ?? '').trim(),
  }))
  .filter((r) => r.seriesName && r.titleContains)
  .sort((a, b) => b.titleContains.length - a.titleContains.length);

export function matchSeriesFromTitleRules(title: string): string | undefined {
  const text = title.trim();
  if (!text) return undefined;
  for (const rule of TITLE_RULES) {
    if (text.includes(rule.titleContains)) return rule.seriesName;
  }
  return undefined;
}

export function deriveSeriesName(title: string): string {
  const manual = matchSeriesFromTitleRules(title);
  if (manual) return manual;
  const cleaned = title
    .replace(/^泡泡萌粒\s*/g, '')
    .replace(SERIES_SUFFIX_RE, '')
    .trim();
  const m = cleaned.match(SERIES_NAME_PATTERN);
  return m?.[1]?.trim() ?? FALLBACK_SERIES;
}
