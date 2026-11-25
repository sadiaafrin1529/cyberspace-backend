import { z } from 'zod';
import { createCategorySchema, slugField, updateCategorySchema } from '../category/category.validation';
import { productFilterSchema } from '../product/product.query';
import { stripHtml } from '../../utils/sanitizeHtml';

// ---------------------------------------------------------------- categories

export const listCategoriesQuery = z.object({
  tree: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  activeOnly: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

/**
 * Same rules as the website (`createCategorySchema`), plus two conveniences:
 *  - `slug` may be omitted: it is generated from `nameEN`.
 *  - `parentSlug` may be used instead of `parentId` to attach to an existing parent.
 */
export const externalCreateCategorySchema = createCategorySchema
  .extend({
    slug: slugField.optional(),
    parentSlug: slugField.optional(),
  })
  .strict();

export const externalUpdateCategorySchema = updateCategorySchema
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

// ------------------------------------------------------------------ products

const text = (max: number) =>
  z
    .string()
    .transform((v) => stripHtml(v).trim())
    .pipe(z.string().max(max));

const translationSchema = z
  .object({
    lang: z.enum(['EN', 'AZ', 'RU']),
    name: text(200).pipe(z.string().min(1, 'Name is required')),
    description: text(5000).optional(),
  })
  .strict();

const translationsField = z
  .array(translationSchema)
  .min(1, 'At least one translation is required')
  .max(3)
  .refine((list) => new Set(list.map((t) => t.lang)).size === list.length, 'Each language may appear only once')
  // Same rule as the admin form: EN is the fallback language and is mandatory.
  .refine((list) => list.some((t) => t.lang === 'EN'), 'An EN (English) translation is required');

const skuField = z
  .string()
  .trim()
  .min(1, 'SKU is required')
  .max(64)
  .regex(/^[\w.\-/#+ ]+$/, 'SKU may contain letters, digits, space and . _ - / # +');

const imageUrlField = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'imageUrl must start with http:// or https://');

const priceField = z
  .number()
  .finite()
  .min(0)
  .max(9_999_999_999.99)
  .refine((n) => Math.abs(Math.round(n * 100) / 100 - n) < 1e-9, 'Price may have at most 2 decimal places');

const currencyField = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code, e.g. USD'));

const productShape = {
  sku: skuField,
  brand: z.string().trim().min(1).max(100).nullable(),
  category: slugField, // slug of ANY existing category, at any depth; verified by the service
  imageUrl: imageUrlField.nullable(),
  price: priceField.nullable(),
  currency: currencyField.nullable(),
  stock: z.number().int().min(0).max(1_000_000_000).nullable(),
  translations: translationsField,
};

const priceNeedsCurrency = (v: { price?: number | null; currency?: string | null }) =>
  v.price == null || !!v.currency;
const PRICE_CURRENCY_MESSAGE = { message: 'currency is required when price is set', path: ['currency'] };

export const externalCreateProductSchema = z
  .object({
    sku: productShape.sku,
    category: productShape.category,
    translations: productShape.translations,
    brand: productShape.brand.optional(),
    imageUrl: productShape.imageUrl.optional(),
    price: productShape.price.optional(),
    currency: productShape.currency.optional(),
    stock: productShape.stock.optional(),
  })
  .strict()
  .refine(priceNeedsCurrency, PRICE_CURRENCY_MESSAGE);

export const externalUpdateProductSchema = z
  .object(productShape)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update')
  .refine((v) => v.price == null || v.currency !== null, { message: 'currency cannot be null while price is set', path: ['currency'] });

export const listProductsQuery = productFilterSchema.extend({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParam = z.coerce.number().int().positive();
export const uuidParam = z.string().trim().min(1).max(64);
