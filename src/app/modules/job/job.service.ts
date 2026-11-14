import httpStatus from 'http-status';
import slugify from 'slugify';
import { Prisma, Lang } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { sanitizeRich, stripHtml } from '../../utils/sanitizeHtml';
import { deleteCv } from '../../utils/cvStorage';
import { JobTranslationInput } from './job.validation';
import { z } from 'zod';
import {
  createJobSchema,
  updateJobSchema,
  jobListQuerySchema,
} from './job.validation';

type CreateJobInput = z.infer<typeof createJobSchema>;
type UpdateJobInput = z.infer<typeof updateJobSchema>;
type JobListQuery = z.infer<typeof jobListQuerySchema>;

/**
 * Expiry is enforced by comparing `expiresAt` to server time on every read/write path.
 * This also persists the EXPIRED status for admin views (no cron in this project).
 */
const syncExpired = async () => {
  await prisma.job.updateMany({
    where: { status: 'PUBLISHED', expiresAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  });
};

const isOpen = (job: { status: string; expiresAt: Date; postedAt: Date }) => {
  const now = Date.now();
  return job.status === 'PUBLISHED' && job.expiresAt.getTime() > now && job.postedAt.getTime() <= now;
};

/** Status as seen right now, even if the DB row has not been synced yet. */
const effectiveStatus = (job: { status: string; expiresAt: Date }) =>
  job.status === 'PUBLISHED' && job.expiresAt.getTime() <= Date.now() ? 'EXPIRED' : job.status;

const uniqueSlug = async (title: string, excludeId?: number) => {
  const base = slugify(title, { lower: true, strict: true }) || 'job';
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await prisma.job.findUnique({ where: { slug } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
};

const cleanTranslation = (t: JobTranslationInput): JobTranslationInput => ({
  ...t,
  description: sanitizeRich(t.description),
  requirements: sanitizeRich(t.requirements),
  responsibilities: t.responsibilities ? sanitizeRich(t.responsibilities) : null,
  educationRequirements: t.educationRequirements ? sanitizeRich(t.educationRequirements) : null,
});

/** Title used by admin views and emails regardless of UI language: EN, else first available. */
export const pickTitle = (translations: { lang: Lang; title: string }[]) =>
  (translations.find((t) => t.lang === 'EN') ?? translations[0])?.title ?? '';

const withTitle = <T extends { translations: { lang: Lang; title: string }[] }>(job: T) => ({
  ...job,
  title: pickTitle(job.translations),
});

const adminInclude = {
  translations: true,
  _count: { select: { applications: true } },
} satisfies Prisma.JobInclude;

const assertPublishable = (status: string | undefined, expiresAt: Date) => {
  if (status === 'PUBLISHED' && expiresAt.getTime() <= Date.now()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry date must be in the future to publish a job');
  }
};

const CreateJob = async (input: CreateJobInput) => {
  const { translations, ...base } = input;
  const postedAt = base.postedAt ?? new Date();
  if (base.expiresAt.getTime() <= postedAt.getTime()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry date must be after the posted date');
  }
  assertPublishable(base.status, base.expiresAt);
  // EXPIRED cannot be chosen on create; keep status consistent with dates.
  const status = base.status === 'EXPIRED' ? 'DRAFT' : base.status;
  const slug = await uniqueSlug(pickTitle(translations));
  const job = await prisma.job.create({
    data: {
      ...base,
      postedAt,
      status,
      slug,
      translations: { create: translations.map(cleanTranslation) },
    },
    include: adminInclude,
  });
  return withTitle(job);
};

const GetAllJobs = async (q: JobListQuery) => {
  await syncExpired();
  const where: Prisma.JobWhereInput = {
    ...(q.status && { status: q.status }),
    ...(q.search && {
      OR: [
        { translations: { some: { title: { contains: q.search, mode: 'insensitive' } } } },
        { department: { contains: q.search, mode: 'insensitive' } },
        { location: { contains: q.search, mode: 'insensitive' } },
      ],
    }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: adminInclude,
    }),
  ]);
  return { data: data.map(withTitle), meta: { page: q.page, limit: q.limit, total } };
};

const GetJobById = async (id: number) => {
  await syncExpired();
  const job = await prisma.job.findUnique({ where: { id }, include: adminInclude });
  if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  return withTitle(job);
};

const publicInclude = { translations: true } satisfies Prisma.JobInclude;

const publicJob = (job: Prisma.JobGetPayload<{ include: typeof publicInclude }>) => {
  const { createdAt, updatedAt, status, ...rest } = job;
  void createdAt; void updatedAt; void status;
  return {
    ...rest,
    title: pickTitle(job.translations),
    // Each translation gets a card-friendly summary: explicit short description or a stripped excerpt.
    translations: job.translations.map((t) => ({
      ...t,
      shortDescription: t.shortDescription || stripHtml(t.description).slice(0, 180),
    })),
  };
};

const openWhere = (): Prisma.JobWhereInput => {
  const now = new Date();
  return { status: 'PUBLISHED', expiresAt: { gt: now }, postedAt: { lte: now } };
};

const GetActiveJobs = async () => {
  const jobs = await prisma.job.findMany({
    where: { ...openWhere(), translations: { some: {} } },
    include: publicInclude,
    orderBy: { postedAt: 'desc' },
  });
  return jobs.map(publicJob);
};

const GetActiveJobBySlug = async (slug: string) => {
  const job = await prisma.job.findFirst({
    where: { slug, ...openWhere() },
    include: publicInclude,
  });
  if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job not found or no longer accepting applications');
  return publicJob(job);
};

const UpdateJob = async (id: number, input: UpdateJobInput) => {
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  const { translations, ...base } = input;
  const postedAt = base.postedAt ?? existing.postedAt;
  const expiresAt = base.expiresAt ?? existing.expiresAt;
  if (expiresAt.getTime() <= postedAt.getTime()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry date must be after the posted date');
  }
  // An EXPIRED job whose deadline is extended stays EXPIRED until republished.
  let status = base.status ?? existing.status;
  if (status === 'EXPIRED' && expiresAt.getTime() > Date.now() && base.status === 'EXPIRED') {
    status = 'DRAFT';
  }
  assertPublishable(status, expiresAt);

  await prisma.$transaction(async (tx) => {
    // Upsert only the languages that were sent; the others are left untouched.
    for (const raw of translations ?? []) {
      const { lang, ...t } = cleanTranslation(raw);
      await tx.jobTranslation.upsert({
        where: { jobId_lang: { jobId: id, lang } },
        create: { jobId: id, lang, ...t },
        update: t,
      });
    }
    // Slug is kept stable on edit so public links do not break.
    await tx.job.update({ where: { id }, data: { ...base, status } });
  });
  return GetJobById(id);
};

const SetJobStatus = async (id: number, status: 'DRAFT' | 'PUBLISHED') => {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  assertPublishable(status, job.expiresAt);
  const updated = await prisma.job.update({ where: { id }, data: { status }, include: adminInclude });
  return withTitle(updated);
};

const DeleteJob = async (id: number) => {
  const job = await prisma.job.findUnique({
    where: { id },
    include: { applications: { select: { cvFilePath: true } } },
  });
  if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  await prisma.job.delete({ where: { id } }); // translations + applications cascade
  await Promise.all(job.applications.map((a) => deleteCv(a.cvFilePath)));
};

const GetStats = async () => {
  await syncExpired();
  const now = new Date();
  const [totalJobs, activeJobs, expiredJobs, draftJobs, totalApplications, pendingApplications, perJob] =
    await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: 'PUBLISHED', expiresAt: { gt: now } } }),
      prisma.job.count({ where: { status: 'EXPIRED' } }),
      prisma.job.count({ where: { status: 'DRAFT' } }),
      prisma.jobApplication.count(),
      prisma.jobApplication.count({ where: { status: 'PENDING' } }),
      prisma.job.findMany({
        select: {
          id: true,
          translations: { select: { lang: true, title: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { applications: { _count: 'desc' } },
        take: 10,
      }),
    ]);
  return {
    totalJobs,
    activeJobs,
    expiredJobs,
    draftJobs,
    totalApplications,
    pendingApplications,
    applicationsPerJob: perJob.map((j) => ({
      id: j.id,
      title: pickTitle(j.translations),
      applications: j._count.applications,
    })),
  };
};

export const JobService = {
  CreateJob,
  GetAllJobs,
  GetJobById,
  GetActiveJobs,
  GetActiveJobBySlug,
  UpdateJob,
  SetJobStatus,
  DeleteJob,
  GetStats,
  isOpen,
  effectiveStatus,
};
