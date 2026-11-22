import httpStatus from 'http-status';
import slugify from 'slugify';
import { z } from 'zod';
import { Lang, Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import {
  createCategorySchema,
  updateCategorySchema,
  createSectionSchema,
  updateSectionSchema,
  createBundleSchema,
  updateBundleSchema,
  publicCategoryQuerySchema,
  adminCategoryQuerySchema,
  adminSectionQuerySchema,
  adminBundleQuerySchema,
} from './solution.validation';

type CreateCategory = z.infer<typeof createCategorySchema>;
type UpdateCategory = z.infer<typeof updateCategorySchema>;
type CreateSection = z.infer<typeof createSectionSchema>;
type UpdateSection = z.infer<typeof updateSectionSchema>;
type CreateBundle = z.infer<typeof createBundleSchema>;
type UpdateBundle = z.infer<typeof updateBundleSchema>;
type PublicCategoryQuery = z.infer<typeof publicCategoryQuerySchema>;
type AdminCategoryQuery = z.infer<typeof adminCategoryQuerySchema>;
type AdminSectionQuery = z.infer<typeof adminSectionQuerySchema>;
type AdminBundleQuery = z.infer<typeof adminBundleQuerySchema>;

/*
 * Hierarchy:  Category (card)  ->  Section (accordion bar)  ->  Bundle (card)  ->  Items / Features ("What's included")
 * An item is either a linked Product (name and price come from the product) or a free-text line.
 */

/** EN first, else the first available translation: stable names for admin views and slugs. */
const pick = <T extends { lang: Lang }>(a: T[]) => a.find((t) => t.lang === 'EN') ?? a[0];

const ordered = { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] };

/** Bundle with everything the details page and the admin form need. */
const bundleInclude = {
  translations: true,
  features: { ...ordered, include: { translations: true } },
  items: {
    ...ordered,
    include: {
      translations: true,
      product: {
        select: {
          id: true,
          sku: true,
          brand: true,
          imageUrl: true,
          price: true,
          currency: true,
          translations: { select: { lang: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.SolutionBundleInclude;

const slugOf = (title: string, fallback: string) => slugify(title, { lower: true, strict: true }) || fallback;

const uniqueCategorySlug = async (name: string) => {
  const base = slugOf(name, 'category');
  let slug = base;
  for (let i = 2; await prisma.solutionCategory.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
};

const uniqueBundleSlug = async (sectionId: number, title: string) => {
  const base = slugOf(title, 'bundle');
  let slug = base;
  for (let i = 2; await prisma.solutionBundle.findUnique({ where: { sectionId_slug: { sectionId, slug } } }); i++)
    slug = `${base}-${i}`;
  return slug;
};

const assertProducts = async (items: { productId: string | null }[]) => {
  const ids = [...new Set(items.map((i) => i.productId).filter((v): v is string => !!v))];
  if (!ids.length) return;
  const found = await prisma.product.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new AppError(httpStatus.BAD_REQUEST, 'One or more linked products do not exist');
};

const nestedItems = (items: CreateBundle['items']) =>
  items.map(({ translations, ...i }, idx) => ({ ...i, sortOrder: idx, translations: { create: translations } }));
const nestedFeatures = (features: CreateBundle['features']) =>
  features.map(({ translations }, idx) => ({ sortOrder: idx, translations: { create: translations } }));

/* ── Categories ───────────────────────────────────────────── */

const adminCategoryCounts = { _count: { select: { sections: true } } } as const;

const shapeCategory = <T extends { translations: { lang: Lang; name: string }[] }>(c: T) => ({
  ...c,
  name: pick(c.translations)?.name ?? '',
});

const CreateCategory = async (input: CreateCategory) => {
  const { translations, ...base } = input;
  const slug = await uniqueCategorySlug(pick(translations).name);
  const category = await prisma.solutionCategory.create({
    data: { ...base, slug, translations: { create: translations } },
    include: { translations: true, ...adminCategoryCounts },
  });
  return shapeCategory(category);
};

/** Products shown by each category's published bundles: distinct linked products plus free-text lines. */
const publicProductCounts = async () => {
  const rows = await prisma.solutionBundleItem.findMany({
    where: { bundle: { isActive: true, section: { isActive: true, category: { isActive: true } } } },
    select: { id: true, productId: true, bundle: { select: { section: { select: { categoryId: true } } } } },
  });
  const byCategory = new Map<number, Set<string>>();
  for (const r of rows) {
    const key = r.bundle.section.categoryId;
    if (!byCategory.has(key)) byCategory.set(key, new Set());
    byCategory.get(key)!.add(r.productId ?? `item-${r.id}`);
  }
  return byCategory;
};

/** Public: active categories with section and product counts. `home` limits to homepage ones. */
const GetPublicCategories = async (q: PublicCategoryQuery) => {
  const where: Prisma.SolutionCategoryWhereInput = {
    isActive: true,
    ...(q.home !== undefined && { showOnHome: q.home }),
  };
  const [rows, products] = await Promise.all([
    prisma.solutionCategory.findMany({
      where,
      ...ordered,
      include: {
        translations: true,
        _count: {
          select: { sections: { where: { isActive: true, bundles: { some: { isActive: true } } } } },
        },
      },
    }),
    publicProductCounts(),
  ]);
  return rows.map((c) => ({
    ...shapeCategory(c),
    sectionCount: c._count.sections,
    productCount: products.get(c.id)?.size ?? 0,
  }));
};

/** Public: one active category with its sections (that have bundles), their bundles, items and features. */
const GetPublicCategory = async (slug: string) => {
  const category = await prisma.solutionCategory.findFirst({
    where: { slug, isActive: true },
    include: {
      translations: true,
      sections: {
        where: { isActive: true, bundles: { some: { isActive: true } } },
        ...ordered,
        include: {
          translations: true,
          bundles: { where: { isActive: true }, ...ordered, include: bundleInclude },
        },
      },
    },
  });
  if (!category) throw new AppError(httpStatus.NOT_FOUND, 'Solution category not found');
  return shapeCategory(category);
};

const GetAdminCategories = async (q: AdminCategoryQuery) => {
  const where: Prisma.SolutionCategoryWhereInput = {
    ...(q.status && { isActive: q.status === 'active' }),
    ...(q.home !== undefined && { showOnHome: q.home }),
    ...(q.search && {
      OR: [
        { slug: { contains: q.search, mode: 'insensitive' } },
        { translations: { some: { name: { contains: q.search, mode: 'insensitive' } } } },
      ],
    }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.solutionCategory.count({ where }),
    prisma.solutionCategory.findMany({
      where,
      ...ordered,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { translations: true, ...adminCategoryCounts },
    }),
  ]);
  return { data: data.map(shapeCategory), meta: { page: q.page, limit: q.limit, total } };
};

const GetAdminCategory = async (id: number) => {
  const category = await prisma.solutionCategory.findUnique({
    where: { id },
    include: { translations: true, ...adminCategoryCounts },
  });
  if (!category) throw new AppError(httpStatus.NOT_FOUND, 'Solution category not found');
  return shapeCategory(category);
};

const UpdateCategory = async (id: number, input: UpdateCategory) => {
  await GetAdminCategory(id);
  const { translations, ...base } = input;
  // The slug is kept on edit so published links never break.
  await prisma.$transaction(async (tx) => {
    for (const { lang, ...t } of translations ?? []) {
      await tx.solutionCategoryTranslation.upsert({
        where: { categoryId_lang: { categoryId: id, lang } },
        create: { categoryId: id, lang, ...t },
        update: t,
      });
    }
    await tx.solutionCategory.update({ where: { id }, data: base });
  });
  return GetAdminCategory(id);
};

/**
 * Sections are protected by a Restrict FK: a category with sections is only deleted when `cascade` is set,
 * which removes its sections, bundles, items and features too. Inquiries are kept (their bundleId becomes null).
 */
const DeleteCategory = async (id: number, cascade = false) => {
  const category = await prisma.solutionCategory.findUnique({ where: { id }, include: adminCategoryCounts });
  if (!category) throw new AppError(httpStatus.NOT_FOUND, 'Solution category not found');
  if (category._count.sections > 0 && !cascade) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This category still has ${category._count.sections} section(s). Delete or move them first, or disable the category instead.`,
    );
  }
  await prisma.$transaction([
    prisma.solutionBundle.deleteMany({ where: { section: { categoryId: id } } }), // items, features, translations cascade
    prisma.solutionSection.deleteMany({ where: { categoryId: id } }),
    prisma.solutionCategory.delete({ where: { id } }), // translations cascade
  ]);
};

const ReorderCategories = async (ids: number[]) => {
  await prisma.$transaction(
    ids.map((id, i) => prisma.solutionCategory.updateMany({ where: { id }, data: { sortOrder: i } })),
  );
};

/* ── Sections ─────────────────────────────────────────────── */

const sectionAdminInclude = {
  translations: true,
  category: { select: { id: true, translations: { select: { lang: true, name: true } } } },
  _count: { select: { bundles: true } },
} satisfies Prisma.SolutionSectionInclude;

const shapeSection = <T extends { translations: { lang: Lang; title: string }[] }>(s: T) => ({
  ...s,
  title: pick(s.translations)?.title ?? '',
});

const assertCategory = async (categoryId: number) => {
  const c = await prisma.solutionCategory.findUnique({ where: { id: categoryId } });
  if (!c) throw new AppError(httpStatus.BAD_REQUEST, 'Selected solution category does not exist');
};

const CreateSection = async (input: CreateSection) => {
  const { translations, ...base } = input;
  await assertCategory(base.categoryId);
  const section = await prisma.solutionSection.create({
    data: { ...base, translations: { create: translations } },
    include: sectionAdminInclude,
  });
  return shapeSection(section);
};

const GetAdminSections = async (q: AdminSectionQuery) => {
  const where: Prisma.SolutionSectionWhereInput = {
    ...(q.categoryId && { categoryId: q.categoryId }),
    ...(q.status && { isActive: q.status === 'active' }),
    ...(q.search && { translations: { some: { title: { contains: q.search, mode: 'insensitive' } } } }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.solutionSection.count({ where }),
    prisma.solutionSection.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: sectionAdminInclude,
    }),
  ]);
  return { data: data.map(shapeSection), meta: { page: q.page, limit: q.limit, total } };
};

const GetAdminSection = async (id: number) => {
  const section = await prisma.solutionSection.findUnique({ where: { id }, include: sectionAdminInclude });
  if (!section) throw new AppError(httpStatus.NOT_FOUND, 'Section not found');
  return shapeSection(section);
};

const UpdateSection = async (id: number, input: UpdateSection) => {
  const existing = await prisma.solutionSection.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Section not found');
  if (input.categoryId && input.categoryId !== existing.categoryId) await assertCategory(input.categoryId);
  const { translations, ...base } = input;
  await prisma.$transaction(async (tx) => {
    for (const { lang, ...t } of translations ?? []) {
      await tx.solutionSectionTranslation.upsert({
        where: { sectionId_lang: { sectionId: id, lang } },
        create: { sectionId: id, lang, ...t },
        update: t,
      });
    }
    await tx.solutionSection.update({ where: { id }, data: base });
  });
  return GetAdminSection(id);
};

/** Same rule as categories: a section with bundles is only deleted when `cascade` is set. */
const DeleteSection = async (id: number, cascade = false) => {
  const section = await prisma.solutionSection.findUnique({ where: { id }, include: { _count: { select: { bundles: true } } } });
  if (!section) throw new AppError(httpStatus.NOT_FOUND, 'Section not found');
  if (section._count.bundles > 0 && !cascade) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This section still has ${section._count.bundles} bundle(s). Delete or move them first, or disable the section instead.`,
    );
  }
  await prisma.$transaction([
    prisma.solutionBundle.deleteMany({ where: { sectionId: id } }),
    prisma.solutionSection.delete({ where: { id } }),
  ]);
};

const ReorderSections = async (ids: number[]) => {
  await prisma.$transaction(
    ids.map((id, i) => prisma.solutionSection.updateMany({ where: { id }, data: { sortOrder: i } })),
  );
};

/* ── Bundles ──────────────────────────────────────────────── */

const bundleAdminInclude = {
  ...bundleInclude,
  section: {
    select: {
      id: true,
      categoryId: true,
      translations: { select: { lang: true, title: true } },
      category: { select: { id: true, translations: { select: { lang: true, name: true } } } },
    },
  },
} satisfies Prisma.SolutionBundleInclude;

const shapeBundle = <T extends { translations: { lang: Lang; title: string }[] }>(b: T) => ({
  ...b,
  title: pick(b.translations)?.title ?? '',
});

const assertSection = async (sectionId: number) => {
  const s = await prisma.solutionSection.findUnique({ where: { id: sectionId } });
  if (!s) throw new AppError(httpStatus.BAD_REQUEST, 'Selected section does not exist');
};

const CreateBundle = async (input: CreateBundle) => {
  const { translations, items, features, ...base } = input;
  await assertSection(base.sectionId);
  await assertProducts(items);
  const slug = await uniqueBundleSlug(base.sectionId, pick(translations).title);
  const bundle = await prisma.solutionBundle.create({
    data: {
      ...base,
      slug,
      translations: { create: translations },
      items: { create: nestedItems(items) },
      features: { create: nestedFeatures(features) },
    },
    include: bundleAdminInclude,
  });
  return shapeBundle(bundle);
};

const GetAdminBundles = async (q: AdminBundleQuery) => {
  const where: Prisma.SolutionBundleWhereInput = {
    ...(q.sectionId && { sectionId: q.sectionId }),
    ...(q.categoryId && { section: { categoryId: q.categoryId } }),
    ...(q.status && { isActive: q.status === 'active' }),
    ...(q.search && { translations: { some: { title: { contains: q.search, mode: 'insensitive' } } } }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.solutionBundle.count({ where }),
    prisma.solutionBundle.findMany({
      where,
      orderBy: [{ sectionId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        translations: true,
        section: bundleAdminInclude.section,
        _count: { select: { items: true, features: true } },
      },
    }),
  ]);
  return { data: data.map(shapeBundle), meta: { page: q.page, limit: q.limit, total } };
};

const GetAdminBundle = async (id: number) => {
  const bundle = await prisma.solutionBundle.findUnique({ where: { id }, include: bundleAdminInclude });
  if (!bundle) throw new AppError(httpStatus.NOT_FOUND, 'Bundle not found');
  return shapeBundle(bundle);
};

const UpdateBundle = async (id: number, input: UpdateBundle) => {
  const existing = await prisma.solutionBundle.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Bundle not found');
  if (input.sectionId && input.sectionId !== existing.sectionId) await assertSection(input.sectionId);
  const { translations, items, features, ...base } = input;
  if (items) await assertProducts(items);

  // The slug is kept on edit; a section move keeps it too unless it clashes in the new section.
  let slug: string | undefined;
  if (base.sectionId && base.sectionId !== existing.sectionId) {
    const clash = await prisma.solutionBundle.findUnique({
      where: { sectionId_slug: { sectionId: base.sectionId, slug: existing.slug } },
    });
    if (clash) slug = await uniqueBundleSlug(base.sectionId, existing.slug);
  }

  await prisma.$transaction(async (tx) => {
    for (const { lang, ...t } of translations ?? []) {
      await tx.solutionBundleTranslation.upsert({
        where: { bundleId_lang: { bundleId: id, lang } },
        create: { bundleId: id, lang, ...t },
        update: t,
      });
    }
    if (items) {
      await tx.solutionBundleItem.deleteMany({ where: { bundleId: id } });
      for (const item of nestedItems(items)) await tx.solutionBundleItem.create({ data: { ...item, bundleId: id } });
    }
    if (features) {
      await tx.solutionBundleFeature.deleteMany({ where: { bundleId: id } });
      for (const f of nestedFeatures(features)) await tx.solutionBundleFeature.create({ data: { ...f, bundleId: id } });
    }
    await tx.solutionBundle.update({ where: { id }, data: { ...base, ...(slug && { slug }) } });
  });
  return GetAdminBundle(id);
};

const DeleteBundle = async (id: number) => {
  const existing = await prisma.solutionBundle.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Bundle not found');
  // Items, features and translations cascade; existing inquiries are kept and their bundleId becomes null.
  await prisma.solutionBundle.delete({ where: { id } });
};

const ReorderBundles = async (ids: number[]) => {
  await prisma.$transaction(
    ids.map((id, i) => prisma.solutionBundle.updateMany({ where: { id }, data: { sortOrder: i } })),
  );
};

export const SolutionService = {
  CreateCategory,
  GetPublicCategories,
  GetPublicCategory,
  GetAdminCategories,
  GetAdminCategory,
  UpdateCategory,
  DeleteCategory,
  ReorderCategories,
  CreateSection,
  GetAdminSections,
  GetAdminSection,
  UpdateSection,
  DeleteSection,
  ReorderSections,
  CreateBundle,
  GetAdminBundles,
  GetAdminBundle,
  UpdateBundle,
  DeleteBundle,
  ReorderBundles,
};
