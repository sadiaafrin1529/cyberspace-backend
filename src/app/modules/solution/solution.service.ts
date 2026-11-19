import httpStatus from 'http-status';
import slugify from 'slugify';
import { z } from 'zod';
import { Lang, Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import {
  createSolutionSchema,
  updateSolutionSchema,
  solutionListQuerySchema,
} from './solution.validation';

type CreateSolutionInput = z.infer<typeof createSolutionSchema>;
type UpdateSolutionInput = z.infer<typeof updateSolutionSchema>;
type SolutionListQuery = z.infer<typeof solutionListQuerySchema>;

/** Title used by admin views regardless of UI language: EN, else first available. */
const pickTitle = (translations: { lang: Lang; title: string }[]) =>
  (translations.find((t) => t.lang === 'EN') ?? translations[0])?.title ?? '';

const withTitle = <T extends { translations: { lang: Lang; title: string }[] }>(s: T) => ({
  ...s,
  title: pickTitle(s.translations),
});

const include = { translations: true } satisfies Prisma.SolutionInclude;

const slugBase = (text: string) => slugify(text, { lower: true, strict: true }) || 'solution';

/** Suffixes -2, -3 … until the slug is free (used when no slug was typed by the admin). */
const uniqueSlug = async (text: string, excludeId?: number) => {
  const base = slugBase(text);
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await prisma.solution.findUnique({ where: { slug } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
};

/** A slug typed by the admin is never silently altered: a clash is an error. */
const assertSlugFree = async (slug: string, excludeId?: number) => {
  const hit = await prisma.solution.findUnique({ where: { slug } });
  if (hit && hit.id !== excludeId) {
    throw new AppError(httpStatus.CONFLICT, 'A solution with this slug already exists');
  }
};

const CreateSolution = async (input: CreateSolutionInput) => {
  const { translations, slug: typedSlug, ...base } = input;
  let slug: string;
  if (typedSlug) {
    await assertSlugFree(typedSlug);
    slug = typedSlug;
  } else {
    slug = await uniqueSlug(pickTitle(translations));
  }
  const solution = await prisma.solution.create({
    data: { ...base, slug, translations: { create: translations } },
    include,
  });
  return withTitle(solution);
};

const GetAllSolutions = async (q: SolutionListQuery) => {
  const where: Prisma.SolutionWhereInput = {
    ...(q.status && { isActive: q.status === 'active' }),
    ...(q.search && {
      OR: [
        { slug: { contains: q.search, mode: 'insensitive' } },
        { translations: { some: { title: { contains: q.search, mode: 'insensitive' } } } },
      ],
    }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.solution.count({ where }),
    prisma.solution.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include,
    }),
  ]);
  return { data: data.map(withTitle), meta: { page: q.page, limit: q.limit, total } };
};

const GetSolutionById = async (id: number) => {
  const solution = await prisma.solution.findUnique({ where: { id }, include });
  if (!solution) throw new AppError(httpStatus.NOT_FOUND, 'Solution not found');
  return withTitle(solution);
};

/** Public: only active solutions that have at least one translation, in display order. */
const GetActiveSolutions = async () => {
  const solutions = await prisma.solution.findMany({
    where: { isActive: true, translations: { some: {} } },
    include,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return solutions.map(withTitle);
};

const GetActiveSolutionBySlug = async (slug: string) => {
  const solution = await prisma.solution.findFirst({
    where: { slug, isActive: true, translations: { some: {} } },
    include,
  });
  if (!solution) throw new AppError(httpStatus.NOT_FOUND, 'Solution not found');
  return withTitle(solution);
};

const UpdateSolution = async (id: number, input: UpdateSolutionInput) => {
  const existing = await prisma.solution.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Solution not found');
  const { translations, slug, ...base } = input;
  if (slug && slug !== existing.slug) await assertSlugFree(slug, id);

  await prisma.$transaction(async (tx) => {
    // Upsert only the languages that were sent; the others are left untouched.
    for (const { lang, ...t } of translations ?? []) {
      await tx.solutionTranslation.upsert({
        where: { solutionId_lang: { solutionId: id, lang } },
        create: { solutionId: id, lang, ...t },
        update: t,
      });
    }
    await tx.solution.update({ where: { id }, data: { ...base, ...(slug && { slug }) } });
  });
  return GetSolutionById(id);
};

const SetSolutionStatus = async (id: number, isActive: boolean) => {
  const existing = await prisma.solution.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Solution not found');
  const solution = await prisma.solution.update({ where: { id }, data: { isActive }, include });
  return withTitle(solution);
};

const SetSolutionOrder = async (id: number, order: number) => {
  const existing = await prisma.solution.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Solution not found');
  const solution = await prisma.solution.update({ where: { id }, data: { order }, include });
  return withTitle(solution);
};

const DeleteSolution = async (id: number) => {
  const existing = await prisma.solution.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Solution not found');
  await prisma.solution.delete({ where: { id } }); // translations cascade
};

export const SolutionService = {
  CreateSolution,
  GetAllSolutions,
  GetSolutionById,
  GetActiveSolutions,
  GetActiveSolutionBySlug,
  UpdateSolution,
  SetSolutionStatus,
  SetSolutionOrder,
  DeleteSolution,
};
