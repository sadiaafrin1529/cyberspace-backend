import { z } from 'zod';

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug is too short')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain only lowercase letters, numbers and hyphens');

// EN is the fallback language, so it is mandatory; AZ/RU may be left blank.
export const nameFields = {
  nameEN: z.string().trim().min(1, 'English name is required').max(100),
  nameAZ: z.string().trim().max(100).default(''),
  nameRU: z.string().trim().max(100).default(''),
};

export const imageUrlField = z.string().trim().max(500).nullable().optional();

// null / omitted = root category.
const parentIdField = z.number().int().positive().nullable().optional();

export const createCategorySchema = z.object({
  slug: slugField,
  parentId: parentIdField,
  ...nameFields,
  imageUrl: imageUrlField,
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).max(100000).optional(),
});

export const updateCategorySchema = z
  .object({
    slug: slugField,
    parentId: parentIdField,
    nameEN: nameFields.nameEN,
    nameAZ: z.string().trim().max(100),
    nameRU: z.string().trim().max(100),
    imageUrl: imageUrlField,
    isActive: z.boolean(),
    order: z.number().int().min(0).max(100000),
  })
  .partial();

export const categoryQuerySchema = z.object({
  tree: z.enum(['true', 'false']).optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
