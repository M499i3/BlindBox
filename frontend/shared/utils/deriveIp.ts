/** Pop Mart 圖鑑 IP：由商品標題推斷（順序很重要，先匹配更具體的規則） */
export const FALLBACK_IP = '其他 IP';

export type IpRule = {
  test: (title: string, upper: string) => boolean;
  ip: string;
};

export const IP_RULES: IpRule[] = [
  { test: (_t, u) => u.includes('THE MONSTERS'), ip: 'LABUBU' },
  { test: (_t, u) => u.includes('SKULLPANDA'), ip: 'SKULLPANDA' },
  { test: (_t, u) => u.includes('CRYBABY'), ip: 'CRYBABY' },
  {
    test: (t) =>
      t.includes('星星人') || t.includes('歡迎來到月球表面') || t.includes('我們都是星星人'),
    ip: '星星人',
  },
  { test: (_t, u) => u.includes('HIRONO'), ip: 'Hirono' },
  { test: (_t, u) => u.includes('ZSIGA'), ip: 'Zsiga' },
  { test: (_t, u) => u.includes('PINO JELLY') || u.replace(/\s/g, '').includes('PINOJELLY'), ip: 'PINO JELLY' },
  { test: (_t, u) => u.includes('LABUBU'), ip: 'LABUBU' },
  { test: (_t, u) => u.includes('HACIPUPU'), ip: 'HACIPUPU' },
  { test: (_t, u) => u.includes('PUCKY'), ip: 'PUCKY' },
  { test: (_t, u) => u.includes('DIMOO'), ip: 'Dimoo' },
  { test: (_t, u) => u.includes('MOLLY'), ip: 'Molly' },
  { test: (_t, u) => u.includes('CHAKA'), ip: 'CHAKA' },
];

/** @deprecated 舊名稱；語意為 IP 名稱 */
export function deriveBrandLabel(title: string): string {
  const t = title.trim();
  if (!t) return FALLBACK_IP;
  const upper = t.toUpperCase();
  for (const rule of IP_RULES) {
    if (rule.test(t, upper)) return rule.ip;
  }
  return FALLBACK_IP;
}

export function deriveIpHints(products: { title: string }[]): string[] {
  const hints = new Set<string>();
  for (const p of products) {
    const ip = deriveBrandLabel(p.title);
    if (ip !== FALLBACK_IP) hints.add(ip);
  }
  return [...hints].sort();
}
