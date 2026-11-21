import { z } from 'zod';

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const imageUrl = z.string().trim().max(2048).url('Must be a valid image URL');

const translationSchema = z.object({
  lang: z.enum(['EN', 'AZ', 'RU']),
  title: z.string().trim().min(2, 'Title is required').max(200),
  shortDescription: optText(300),
  description: optText(20_000),
});

const translationsField = z
  .array(translationSchema)
  .min(1, 'At least one language is required')
  .max(3)
  .refine((a) => new Set(a.map((t) => t.lang)).size === a.length, 'Duplicate language');

const baseFields = {
  categoryId: z.coerce.number().int().positive('Category is required'),
  coverImage: imageUrl,
  images: z.array(imageUrl).max(30).default([]),
};

// EN is the fallback language shown when a translation is missing, so it is mandatory on create.
export const createProjectSchema = z.object({
  ...baseFields,
  translations: translationsField.refine((a) => a.some((t) => t.lang === 'EN'), 'English content is required'),
});

// On update, only the languages sent are upserted; other languages are never touched.
export const updateProjectSchema = z
  .object({ ...baseFields })
  .partial()
  .extend({ translations: translationsField.optional() });

export const projectListQuerySchema = z.object({
  category: z.string().trim().max(80).optional(), // category slug
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});
