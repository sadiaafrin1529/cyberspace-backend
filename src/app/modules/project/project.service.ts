import httpStatus from 'http-status';
import slugify from 'slugify';
import { z } from 'zod';
import { Lang, Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { createProjectSchema, updateProjectSchema, projectListQuerySchema } from './project.validation';

type CreateInput = z.infer<typeof createProjectSchema>;
type UpdateInput = z.infer<typeof updateProjectSchema>;
type ListQuery = z.infer<typeof projectListQuerySchema>;

const categorySelect = {
  id: true,
  slug: true,
  translations: { select: { lang: true, name: true } },
} satisfies Prisma.ProjectCategorySelect;

const include = { translations: true, category: { select: categorySelect } } satisfies Prisma.ProjectInclude;

/** Listing payload: no long description or gallery. */
const listSelect = {
  id: true,
  slug: true,
  coverImage: true,
  createdAt: true,
  translations: { select: { lang: true, title: true, shortDescription: true } },
  category: { select: categorySelect },
} satisfies Prisma.ProjectSelect;

/** EN first, else the first available translation: stable names for admin views and slugs. */
const pick = <T extends { lang: Lang }>(a: T[]) => a.find((t) => t.lang === 'EN') ?? a[0];

type WithCategory = { category: { translations: { lang: Lang; name: string }[] } };
type WithTitle = { translations: { lang: Lang; title: string }[] };

const shape = <T extends WithTitle & WithCategory>(p: T) => ({
  ...p,
  title: pick(p.translations)?.title ?? '',
  category: { ...p.category, name: pick(p.category.translations)?.name ?? '' },
});

const uniqueSlug = async (title: string) => {
  const base = slugify(title, { lower: true, strict: true }) || 'project';
  let slug = base;
  for (let i = 2; await prisma.project.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
};

const assertCategory = async (categoryId: number) => {
  const c = await prisma.projectCategory.findUnique({ where: { id: categoryId } });
  if (!c) throw new AppError(httpStatus.BAD_REQUEST, 'Selected category does not exist');
};

const CreateProject = async (input: CreateInput) => {
  const { translations, ...base } = input;
  await assertCategory(base.categoryId);
  const slug = await uniqueSlug(pick(translations).title);
  const project = await prisma.project.create({
    data: { ...base, slug, translations: { create: translations } },
    include,
  });
  return shape(project);
};

const GetAllProjects = async (q: ListQuery) => {
  const where: Prisma.ProjectWhereInput = {
    ...(q.category && { category: { slug: q.category } }),
    ...(q.search && {
      OR: [
        { translations: { some: { title: { contains: q.search, mode: 'insensitive' } } } },
        { category: { translations: { some: { name: { contains: q.search, mode: 'insensitive' } } } } },
      ],
    }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      select: listSelect,
    }),
  ]);
  return { data: data.map(shape), meta: { page: q.page, limit: q.limit, total } };
};

/** Accepts a numeric id or a slug. */
const GetProject = async (idOrSlug: string) => {
  const isId = /^\d+$/.test(idOrSlug);
  const project = await prisma.project.findUnique({
    where: isId ? { id: Number(idOrSlug) } : { slug: idOrSlug },
    include,
  });
  if (!project) throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  return shape(project);
};

const UpdateProject = async (id: number, input: UpdateInput) => {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  if (input.categoryId && input.categoryId !== existing.categoryId) await assertCategory(input.categoryId);
  const { translations, ...base } = input;

  // The slug is kept on edit so published links never break.
  await prisma.$transaction(async (tx) => {
    // Upsert only the languages that were sent; the others are left untouched.
    for (const { lang, ...t } of translations ?? []) {
      await tx.projectTranslation.upsert({
        where: { projectId_lang: { projectId: id, lang } },
        create: { projectId: id, lang, ...t },
        update: t,
      });
    }
    await tx.project.update({ where: { id }, data: base });
  });
  return GetProject(String(id));
};

const DeleteProject = async (id: number) => {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  await prisma.project.delete({ where: { id } }); // translations cascade
};

export const ProjectService = { CreateProject, GetAllProjects, GetProject, UpdateProject, DeleteProject };
