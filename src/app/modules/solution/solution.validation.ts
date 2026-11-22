import { z } from 'zod';

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const lang = z.enum(['EN', 'AZ', 'RU']);

/** Icon is a short key (e.g. "shield") or an uploaded image URL. */
const iconField = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const accentColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Accent colour must be a hex colour like #1457d9');

/** Translations: unique languages, English mandatory on create (it is the fallback language). */
const translations = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .min(1, 'At least one language is required')
    .max(3)
    .refine((a) => new Set(a.map((t: { lang: string }) => t.lang)).size === a.length, 'Duplicate language');

const hasEnglish = (a: { lang: string }[]) => a.some((t) => t.lang === 'EN');

const sortOrder = z.coerce.number().int().min(0).max(100_000).default(0);

/* ── Category ─────────────────────────────────────────────── */

const categoryTranslation = z.object({
  lang,
  name: z.string().trim().min(2, 'Name is required').max(120),
  description: optText(2000),
  instruction: optText(300),
});

const categoryBase = {
  icon: iconField,
  image: iconField,
  accentColor: accentColor.default('#1457d9'),
  isActive: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
  sortOrder,
};

export const createCategorySchema = z.object({
  ...categoryBase,
  translations: translations(categoryTranslation).refine(hasEnglish, 'English content is required'),
});

export const updateCategorySchema = z
  .object({ ...categoryBase })
  .partial()
  .extend({ translations: translations(categoryTranslation).optional() });

/* ── Bundle ───────────────────────────────────────────────── */

const bundleTranslation = z.object({
  lang,
  title: z.string().trim().min(2, 'Title is required').max(160),
  description: optText(2000),
  badge: optText(60),
});

const itemTranslation = z.object({
  lang,
  title: z.string().trim().min(1, 'Item title is required').max(200),
  description: optText(500),
});

const featureTranslation = z.object({
  lang,
  title: z.string().trim().min(1, 'Feature text is required').max(300),
});

const price = z
  .union([z.number(), z.string().trim()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 9_999_999_999.99) {
      ctx.addIssue({ code: 'custom', message: 'Invalid price' });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

// A "What's included" line is a linked Product: its name, description and price come from the product.
// Free-text lines (services, SLA) are features. Translations / price are optional overrides for API clients.
const itemInput = z.object({
  productId: z.string().trim().min(1, 'Pick a product').max(100),
  price,
  translations: z
    .array(itemTranslation)
    .max(3)
    .default([])
    .refine((a) => new Set(a.map((t) => t.lang)).size === a.length, 'Duplicate language'),
});

const featureInput = z.object({
  translations: translations(featureTranslation).refine(hasEnglish, 'English feature text is required'),
});

const bundleBase = {
  sectionId: z.coerce.number().int().positive('Section is required'),
  icon: iconField,
  price,
  currency: z.string().trim().toUpperCase().min(3).max(3).default('AZN'),
  billingPeriod: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('ONE_TIME'),
  isActive: z.boolean().default(true),
  sortOrder,
};

// Items and features are sent as ordered arrays; their position becomes sortOrder.
export const createBundleSchema = z.object({
  ...bundleBase,
  translations: translations(bundleTranslation).refine(hasEnglish, 'English content is required'),
  items: z.array(itemInput).max(100).default([]),
  features: z.array(featureInput).max(100).default([]),
});

// On update, only the sent translations are upserted; items/features, when sent, replace the whole list.
export const updateBundleSchema = z
  .object({ ...bundleBase })
  .partial()
  .extend({
    translations: translations(bundleTranslation).optional(),
    items: z.array(itemInput).max(100).optional(),
    features: z.array(featureInput).max(100).optional(),
  });

/* ── Section (accordion bar inside a category) ────────────── */

const sectionTranslation = z.object({
  lang,
  title: z.string().trim().min(2, 'Title is required').max(160),
  description: optText(500),
});

const sectionBase = {
  categoryId: z.coerce.number().int().positive('Solution category is required'),
  icon: iconField,
  isActive: z.boolean().default(true),
  sortOrder,
};

export const createSectionSchema = z.object({
  ...sectionBase,
  translations: translations(sectionTranslation).refine(hasEnglish, 'English content is required'),
});

export const updateSectionSchema = z
  .object({ ...sectionBase })
  .partial()
  .extend({ translations: translations(sectionTranslation).optional() });

export const reorderSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
});

/* ── Queries ──────────────────────────────────────────────── */

const flag = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const publicCategoryQuerySchema = z.object({ home: flag });

export const adminCategoryQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  home: flag,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const adminSectionQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const adminBundleQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
