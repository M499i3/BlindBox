/** 圖鑑實際載入來源（除錯用） */
export type CatalogLoadMeta =
  | {
      kind: 'supabase';
      count: number;
      sampleExternalId: string;
      sampleTitle: string;
    }
  | {
      kind: 'static';
      reason: 'bundled-json' | 'rest-error' | 'empty-table';
      detail?: string;
      count: number;
    };
