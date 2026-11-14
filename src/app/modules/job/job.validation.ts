import { z } from 'zod';
import { stripHtml } from '../../utils/sanitizeHtml';

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const richRequired = (label: string) =>
  z
    .string()
    .max(50_000)
    .refine((v) => stripHtml(v).length >= 5, `${label} is required`);

const richOptional = z
  .string()
  .max(50_000)
  .optional()
  .nullable()
  .transform((v) => (v && stripHtml(v).length ? v : null));

const translationSchema = z.object({
  lang: z.enum(['EN', 'AZ', 'RU']),
  title: z.string().trim().min(2, 'Job title is required').max(200),
  shortDescription: optText(300),
  description: richRequired('Job description'),
  responsibilities: richOptional,
  requirements: richRequired('Requirements'),
  requiredSkills: z
    .array(z.string().trim().min(1).max(60))
    .max(50)
    .default([])
    .transform((a) => [...new Set(a)]),
  experienceLevel: optText(120),
  educationRequirements: richOptional,
});

const translationsField = z
  .array(translationSchema)
  .min(1, 'At least one language is required')
  .max(3)
  .refine((a) => new Set(a.map((t) => t.lang)).size === a.length, 'Duplicate language');

const jobFields = {
  department: z.string().trim().min(2, 'Department is required').max(120),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
  workplaceType: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']),
  location: z.string().trim().min(2, 'Location is required').max(200),
  vacancies: z.coerce.number().int().min(1).max(1000).default(1),
  salaryRange: optText(120),
  postedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date({ invalid_type_error: 'Application expiry date is required' }),
  status: z.enum(['DRAFT', 'PUBLISHED', 'EXPIRED']).default('DRAFT'),
};

// EN is the fallback language shown when a translation is missing, so it is mandatory on create.
export const createJobSchema = z.object({
  ...jobFields,
  translations: translationsField.refine(
    (a) => a.some((t) => t.lang === 'EN'),
    'English content is required',
  ),
});

// On update, only the languages sent are upserted; other languages are never touched.
export const updateJobSchema = z.object(jobFields).partial().extend({
  translations: translationsField.optional(),
});

export type JobTranslationInput = z.infer<typeof translationSchema>;

export const jobStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export const jobListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'EXPIRED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const applicationBodySchema = z.object({
  jobId: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  email: z.string().trim().toLowerCase().email('Valid email is required').max(200),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d][\d\s()-]{5,24}$/, 'Valid phone number is required'),
  message: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const applicationListQuerySchema = z.object({
  jobId: z.coerce.number().int().positive().optional(),
  status: z
    .enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'])
    .optional(),
  search: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const applicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'ACCEPTED', 'REJECTED']),
});
