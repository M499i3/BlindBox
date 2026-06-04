/** Official Pop Mart brand mark (user-provided) */
export const POP_MART_BRAND_LOGO =
  'https://www.rosedalecenter.com/media/v1/595/2024/12/POP-MART-LOGO.png';

export function brandLogoForSlug(slug: string | undefined): string | undefined {
  if (slug === 'pop-mart') return POP_MART_BRAND_LOGO;
  return undefined;
}

export function brandLogoForName(name: string | undefined): string | undefined {
  if (name === 'Pop Mart') return POP_MART_BRAND_LOGO;
  return undefined;
}
