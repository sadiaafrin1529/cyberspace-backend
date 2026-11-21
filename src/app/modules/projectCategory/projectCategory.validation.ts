import { z } from 'zod';

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug is too short')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain only lowercase letters, numbers and hyphens');

const translationSchema = z.object({
  lang: z.enum(['EN', 'AZ', 'RU']),
  name: z.string().trim().min(2, 'Name is required').max(60),
});

const translationsField = z
  .array(translationSchema)
  .min(1, 'At least one language is required')
  .max(3)
  .refine((a) => new Set(a.map((t) => t.lang)).size === a.length, 'Duplicate language');

// EN is the fallback language shown when a translation is missing, so it is mandatory on create.
export const createProjectCategorySchema = z.object({
  slug: slugField.optional(),
  translations: translationsField.refine(
    (a) => a.some((t) => t.lang === 'EN'),
    'English name is required',
  ),
});

// On update, only the languages sent are upserted; other languages are never touched.
export const updateProjectCategorySchema = z.object({
  slug: slugField.optional(),
  translations: translationsField.optional(),
});
