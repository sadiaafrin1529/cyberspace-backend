import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { randomUUID } from 'crypto';
import { Lang, Prisma } from '@prisma/client';
import type { ProductFilter, ShopQuery } from './product.query';

interface IProductTranslation {
  lang: Lang;
  name: string;
  description?: string;
}

interface ICreateProduct {
  sku: string;
  brand?: string | null;
  category: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  stock?: number | null;
  translations: IProductTranslation[];
}

interface IUpdateProduct {
  sku?: string;
  brand?: string | null;
  category?: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  stock?: number | null;
  translations?: IProductTranslation[];
}

/**
 * Expands the selected category slugs/ids with ALL their descendants (any depth).
 * One query for the whole (small) category table + an in-memory walk: no N+1, no per-level queries.
 * Unknown slugs are kept as-is so legacy products that reference a removed category still match.
 */
const resolveCategorySlugs = async (slugs: string[], ids: string[]): Promise<string[] | null> => {
  if (slugs.length === 0 && ids.length === 0) return null;
  const all = await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } });
  const children = new Map<number, number[]>();
  const byId = new Map(all.map((c) => [c.id, c]));
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  for (const c of all) {
    if (c.parentId != null) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id]);
  }
  const out = new Set<string>();
  const seen = new Set<number>();
  const stack: number[] = [];
  for (const slug of slugs) {
    const c = bySlug.get(slug);
    if (c) stack.push(c.id);
    else out.add(slug);
  }
  for (const raw of ids) {
    const id = Number(raw);
    if (Number.isInteger(id) && byId.has(id)) stack.push(id);
  }
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue; // also guards against any accidental cycle
    seen.add(id);
    out.add(byId.get(id)!.slug);
    stack.push(...(children.get(id) ?? []));
  }
  return [...out];
};

type Exclude = 'category' | 'brand' | 'price';

/** Builds the WHERE clause; `exclude` drops one facet so its own counts ignore its own filter. */
const buildWhere = (
  f: ProductFilter,
  categorySlugs: string[] | null,
  usePrice: boolean,
  exclude?: Exclude,
): Prisma.ProductWhereInput => {
  const and: Prisma.ProductWhereInput[] = [];
  if (categorySlugs && exclude !== 'category') and.push({ category: { in: categorySlugs } });
  if (f.brand.length && exclude !== 'brand') and.push({ brand: { in: f.brand } });
  if (usePrice && exclude !== 'price' && (f.minPrice !== undefined || f.maxPrice !== undefined)) {
    and.push({ price: { gte: f.minPrice, lte: f.maxPrice } });
  }
  if (f.q) {
    and.push({
      OR: [
        { sku: { contains: f.q, mode: 'insensitive' } },
        { brand: { contains: f.q, mode: 'insensitive' } },
        { translations: { some: { name: { contains: f.q, mode: 'insensitive' } } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
};

const GetAllProducts = async (filter?: ProductFilter) => {
  const slugs = filter ? await resolveCategorySlugs(filter.category, filter.categoryId) : null;
  return prisma.product.findMany({
    where: filter ? buildWhere(filter, slugs, true) : undefined,
    include: { translations: true },
    orderBy: { syncedAt: 'desc' },
  });
};

/** Server-side filtered, sorted and paginated listing for the public shop, with facet counts. */
const SearchShopProducts = async (query: ShopQuery) => {
  const [settingRows, categorySlugs] = await Promise.all([
    prisma.setting.findMany(),
    resolveCategorySlugs(query.category, query.categoryId),
  ]);
  const flag = (key: string) => settingRows.find((r) => r.key === key)?.value ?? true;
  const showPrices = flag('showPrices');
  const showStock = flag('showStock');

  const where = buildWhere(query, categorySlugs, showPrices);
  const sort = !showPrices && (query.sort === 'priceAsc' || query.sort === 'priceDesc') ? 'relevance' : query.sort;
  const skip = (query.page - 1) * query.limit;

  const nulls = 'last' as const;
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === 'priceAsc'
      ? [{ price: { sort: 'asc', nulls } }, { id: 'asc' }]
      : sort === 'priceDesc'
        ? [{ price: { sort: 'desc', nulls } }, { id: 'asc' }]
        : [{ syncedAt: 'desc' }, { id: 'asc' }];

  const itemsPromise = async () => {
    if (sort !== 'nameAsc') {
      return prisma.product.findMany({ where, orderBy, skip, take: query.limit, include: { translations: true } });
    }
    // Names live in a translation table, so order by the display name in two cheap steps:
    // 1) light projection of every match, sorted in memory; 2) fetch just the requested page.
    const light = await prisma.product.findMany({
      where,
      select: { id: true, translations: { select: { lang: true, name: true } } },
    });
    const collator = new Intl.Collator(query.lang.toLowerCase());
    const nameOf = (t: { lang: Lang; name: string }[]) =>
      (t.find((x) => x.lang === query.lang) ?? t.find((x) => x.lang === 'EN') ?? t[0])?.name ?? '';
    const pageIds = light
      .sort((a, b) => collator.compare(nameOf(a.translations), nameOf(b.translations)) || a.id.localeCompare(b.id))
      .slice(skip, skip + query.limit)
      .map((p) => p.id);
    const rows = await prisma.product.findMany({ where: { id: { in: pageIds } }, include: { translations: true } });
    const order = new Map(pageIds.map((id, i) => [id, i]));
    return rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  };

  const [items, total, catGroups, brandGroups, priceAgg] = await Promise.all([
    itemsPromise(),
    prisma.product.count({ where }),
    prisma.product.groupBy({
      by: ['category'],
      where: buildWhere(query, categorySlugs, showPrices, 'category'),
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ['brand'],
      where: buildWhere(query, categorySlugs, showPrices, 'brand'),
      _count: { _all: true },
    }),
    showPrices
      ? prisma.product.aggregate({
          where: { AND: [buildWhere(query, categorySlugs, showPrices, 'price'), { price: { not: null } }] },
          _min: { price: true },
          _max: { price: true },
        })
      : Promise.resolve(null),
  ]);

  const categories: Record<string, number> = {};
  for (const g of catGroups) categories[g.category] = g._count._all;
  const brands: Record<string, number> = {};
  for (const g of brandGroups) if (g.brand) brands[g.brand] = g._count._all;
  const min = priceAgg?._min.price;
  const max = priceAgg?._max.price;

  return {
    items: items.map((p) => ({
      ...p,
      price: showPrices ? p.price : null,
      currency: showPrices ? p.currency : null,
      stock: showStock ? p.stock : null,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      facets: {
        categories,
        brands,
        price: min != null && max != null ? { min: Math.floor(Number(min)), max: Math.ceil(Number(max)) } : null,
      },
    },
  };
};

/** Paginated, unmasked listing for the key-authenticated Developer API (same filters as GetAllProducts). */
const ListProductsPaged = async (filter: ProductFilter, page: number, limit: number) => {
  const slugs = await resolveCategorySlugs(filter.category, filter.categoryId);
  const where = buildWhere(filter, slugs, true);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { translations: true },
      orderBy: [{ syncedAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};

const GetProductBySku = async (sku: string) => {
  return prisma.product.findUnique({ where: { sku }, include: { translations: true } });
};

const GetProductById = async (id: string) => {
  return prisma.product.findUnique({
    where: { id },
    include: { translations: true },
  });
};

/** Products reference categories by slug; any category at any nesting depth is valid. */
const assertCategoryExists = async (slug: unknown) => {
  if (typeof slug !== 'string' || !slug.trim()) throw new AppError(httpStatus.BAD_REQUEST, 'Category is required');
  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!category) throw new AppError(httpStatus.BAD_REQUEST, `Category "${slug}" does not exist`);
};

const CreateProduct = async (data: ICreateProduct) => {
  await assertCategoryExists(data.category);
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) throw new AppError(httpStatus.CONFLICT, 'A product with this SKU already exists');
  const { translations, ...productData } = data;
  return prisma.product.create({
    data: {
      id: randomUUID(),
      ...productData,
      syncedAt: new Date(),
      translations: { create: translations },
    },
    include: { translations: true },
  });
};

const UpdateProduct = async (id: string, data: IUpdateProduct) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  // Only re-validate when the category actually changes, so legacy products stay editable.
  if (data.category !== undefined && data.category !== product.category) await assertCategoryExists(data.category);
  const { translations, ...productData } = data;
  if (translations && translations.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.productTranslation.deleteMany({ where: { productId: id } });
      await tx.productTranslation.createMany({
        data: translations.map((t) => ({ ...t, productId: id })),
      });
    });
  }
  return prisma.product.update({
    where: { id },
    data: { ...productData, syncedAt: new Date() },
    include: { translations: true },
  });
};

const DeleteProduct = async (id: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  // ProductTranslation.productId is ON DELETE RESTRICT, so translations must go first. One transaction keeps
  // the product intact if the delete is refused (e.g. customer inquiries still reference it).
  await prisma.$transaction([
    prisma.productTranslation.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);
};

export const ProductService = { GetAllProducts, SearchShopProducts, ListProductsPaged, GetProductBySku, GetProductById, CreateProduct, UpdateProduct, DeleteProduct };
