import { z } from 'zod';

/** Accent colours and icon presets of the public Solutions cards (see sol-card--* styles on the website). */
export const SOLUTION_COLORS = ['blue', 'orange', 'cyan', 'red', 'violet', 'green'] as const;
export const SOLUTION_ICON_KEYS = ['server', 'bolt', 'fan', 'video', 'shield', 'gear'] as const;

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .url('Must be a valid image URL')
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const translationSchema = z.object({
  lang: z.enum(['EN', 'AZ', 'RU']),
  title: z.string().trim().min(2, 'Title is required').max(200),
  shortDescription: z.string().trim().min(2, 'Short description is required').max(300),
  description: optText(20_000),
  features: z
    .array(z.string().trim().min(1).max(160))
    .max(12)
    .default([])
    .transform((a) => [...new Set(a)]),
  seoTitle: optText(70),
  seoDescription: optText(200),
});

const translationsField = z
  .array(translationSchema)
  .min(1, 'At least one language is required')
  .max(3)
  .refine((a) => new Set(a.map((t) => t.lang)).size === a.length, 'Duplicate language');

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug is too short')
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain only lowercase letters, numbers and hyphens');

const solutionFields = {
  slug: slugField.optional(),
  color: z.enum(SOLUTION_COLORS).default('blue'),
  iconKey: z
    .enum(SOLUTION_ICON_KEYS)
    .optional()
    .nullable()
    .transform((v) => v ?? null),
  iconUrl: imageUrl,
  imageUrl,
  bannerUrl: imageUrl,
  images: z.array(z.string().trim().url().max(2048)).max(12).default([]),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(100_000).default(0),
};

// EN is the fallback language shown when a translation is missing, so it is mandatory on create.
export const createSolutionSchema = z.object({
  ...solutionFields,
  translations: translationsField.refine(
    (a) => a.some((t) => t.lang === 'EN'),
    'English content is required',
  ),
});

// On update, only the languages sent are upserted; other languages are never touched.
export const updateSolutionSchema = z
  .object({ ...solutionFields })
  .partial()
  .extend({ translations: translationsField.optional() });

export const solutionStatusSchema = z.object({ isActive: z.boolean() });

export const solutionOrderSchema = z.object({
  order: z.coerce.number().int().min(0).max(100_000),
});

export const solutionListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type SolutionTranslationInput = z.infer<typeof translationSchema>;
