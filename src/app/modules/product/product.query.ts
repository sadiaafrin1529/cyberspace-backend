import { z } from 'zod';

const csv = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) =>
    v
      ? Array.from(new Set(v.split(',').map((x) => x.trim()).filter(Boolean)))
      : [],
  );

const num = z.coerce.number().finite().min(0).optional();

/** Shared filter params for product listing (`GET /products`) and the paginated shop endpoint. */
export const productFilterSchema = z.object({
  /** Category slugs (comma separated). Every descendant category is included automatically. */
  category: csv,
  /** Category ids (comma separated); resolved to slugs, descendants included. */
  categoryId: csv,
  brand: csv,
  q: z.string().trim().max(100).optional(),
  minPrice: num,
  maxPrice: num,
});

export const shopQuerySchema = productFilterSchema.extend({
  sort: z.enum(['relevance', 'nameAsc', 'priceAsc', 'priceDesc']).default('relevance'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
  lang: z.enum(['EN', 'AZ', 'RU']).default('EN'),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;
export type ShopQuery = z.infer<typeof shopQuerySchema>;
