import ipImagesJson from '@/frontend/data/popmart-hk-ip-images.json';

export type PopmartIpImageRow = {
  slug: string;
  name: string;
  image: string;
  imageHover?: string;
};

type PopmartIpImagesFile = {
  scrapedAt: string;
  sourceUrl: string;
  ips: PopmartIpImageRow[];
  bySlug: Record<string, PopmartIpImageRow>;
};

const data = ipImagesJson as PopmartIpImagesFile;

/** Official Pop Mart HK menu IP icons (by series slug, e.g. labubu, crybaby). */
export const popmartIpImagesBySlug: Record<string, PopmartIpImageRow> = data.bySlug ?? {};

export function popmartIpImageForSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return popmartIpImagesBySlug[slug]?.image;
}

export function popmartIpImageForName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const row = data.ips.find((ip) => ip.name === name);
  return row?.image;
}
