import {
  getCatalogBrands,
  getCatalogProducts,
  getCatalogIps,
} from '@/frontend/infrastructure/api/catalogApi';
import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import type { Listing } from '@/frontend/domain/entities/listing';
import type { IdealSwapEntry } from '@/frontend/presentation/components/listing/IdealSwapTargetsSection';
import type { CatalogProductPickerValue } from '@/frontend/presentation/hooks/useCatalogProductPicker';
import {
  catalogProductLineKey,
  filterProductsByIp,
  productsInLine,
} from '@/frontend/shared/utils/catalogProductLines';
import { resolveHierarchyLabels } from '@/frontend/shared/utils/catalogHierarchy';

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function findStyleProduct(
  products: CatalogProduct[],
  opts: {
    catalogProductId?: string;
    itemName?: string;
    productLine?: string;
    ip?: string;
  }
): CatalogProduct | undefined {
  if (opts.catalogProductId) {
    const byId = products.find((p) => p.id === opts.catalogProductId);
    if (byId) return byId;
  }
  const pool = opts.ip ? filterProductsByIp(products, opts.ip) : products;
  const linePool = opts.productLine ? productsInLine(pool, opts.productLine) : pool;
  const name = (opts.itemName ?? '').trim();
  if (!name) return undefined;
  return linePool.find((p) => p.title.trim() === name);
}

function pickerFromProduct(
  product: CatalogProduct,
  brandName: string,
  brandSlug: string
): Partial<CatalogProductPickerValue> {
  const labels = resolveHierarchyLabels(product);
  return {
    brand: product.brandName ?? brandName,
    brandSlug: product.brandSlug ?? brandSlug,
    ip: product.ipName ?? labels.ip,
    ipSlug: product.ipSlug ?? '',
    productLine: product.seriesName ?? catalogProductLineKey(product),
    catalogProductId: product.id,
    itemName: product.title,
  };
}

async function resolveBrandSlug(brandName: string): Promise<{ name: string; slug: string } | null> {
  const brands = await getCatalogBrands();
  const row = brands.find((b) => b.name === brandName);
  if (!row) return null;
  const slug = row.slug ?? slugify(row.name);
  return { name: row.name, slug };
}

export async function enrichPickerInitial(
  seed: Partial<CatalogProductPickerValue>
): Promise<Partial<CatalogProductPickerValue>> {
  const brandName = (seed.brand ?? '').trim();
  if (!brandName) return { ...seed };

  const brand = await resolveBrandSlug(brandName);
  if (!brand) return { ...seed };

  const [ips, products] = await Promise.all([
    getCatalogIps(brand.slug),
    getCatalogProducts({ brand: brand.slug }),
  ]);

  const product = findStyleProduct(products, {
    catalogProductId: seed.catalogProductId,
    itemName: seed.itemName,
    productLine: seed.productLine,
    ip: seed.ip,
  });

  if (product) {
    const fromProduct = pickerFromProduct(product, brand.name, brand.slug);
    const ipRow = ips.find(
      (row) => row.name === fromProduct.ip || row.slug === fromProduct.ipSlug
    );
    return {
      ...seed,
      ...fromProduct,
      brand: brand.name,
      brandSlug: brand.slug,
      ipSlug: ipRow?.slug ?? fromProduct.ipSlug ?? seed.ipSlug ?? '',
    };
  }

  const ipRow = ips.find((row) => row.name === seed.ip);
  return {
    ...seed,
    brand: brand.name,
    brandSlug: brand.slug,
    ip: seed.ip ?? ipRow?.name ?? '',
    ipSlug: ipRow?.slug ?? seed.ipSlug ?? '',
  };
}

export function listingToPickerSeed(listing: Listing): Partial<CatalogProductPickerValue> {
  return {
    brand: listing.brand,
    ip: listing.ip ?? '',
    productLine: listing.series,
    itemName: listing.itemName,
    catalogProductId: listing.catalogProductId ?? '',
  };
}

export async function enrichPickerInitialFromListing(
  listing: Listing
): Promise<Partial<CatalogProductPickerValue>> {
  return enrichPickerInitial(listingToPickerSeed(listing));
}

export async function enrichIdealSwapEntries(entries: IdealSwapEntry[]): Promise<IdealSwapEntry[]> {
  const enriched = await Promise.all(
    entries.map(async (entry) => {
      if (entry.catalogProductId) {
        const resolved = await enrichPickerInitial(entry);
        return { ...entry, ...resolved };
      }
      const hasLabels =
        entry.brand && entry.ip && entry.productLine && entry.itemName.trim();
      if (!hasLabels) return entry;
      const resolved = await enrichPickerInitial(entry);
      return { ...entry, ...resolved };
    })
  );
  return enriched;
}
