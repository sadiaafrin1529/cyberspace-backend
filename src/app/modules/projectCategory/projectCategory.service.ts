import httpStatus from 'http-status';
import slugify from 'slugify';
import { z } from 'zod';
import { Lang, Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { createProjectCategorySchema, updateProjectCategorySchema } from './projectCategory.validation';

type CreateInput = z.infer<typeof createProjectCategorySchema>;
type UpdateInput = z.infer<typeof updateProjectCategorySchema>;
type Tr = { lang: Lang; name: string };

const include = {
  translations: true,
  _count: { select: { projects: true } },
} satisfies Prisma.ProjectCategoryInclude;

/** Name used by admin views regardless of UI language: EN, else first available. */
const pickName = (translations: Tr[]) =>
  (translations.find((t) => t.lang === 'EN') ?? translations[0])?.name ?? '';

const withName = <T extends { translations: Tr[] }>(c: T) => ({ ...c, name: pickName(c.translations) });

/** A name is unique per language, ignoring case. */
const assertNamesFree = async (translations: Tr[], excludeId?: number) => {
  for (const t of translations) {
    const hit = await prisma.projectCategoryTranslation.findFirst({
      where: {
        lang: t.lang,
        name: { equals: t.name, mode: 'insensitive' },
        ...(excludeId && { NOT: { categoryId: excludeId } }),
      },
    });
    if (hit) throw new AppError(httpStatus.CONFLICT, `A category with this name already exists (${t.lang})`);
  }
};

const assertSlugFree = async (slug: string, excludeId?: number) => {
  const hit = await prisma.projectCategory.findUnique({ where: { slug } });
  if (hit && hit.id !== excludeId) {
    throw new AppError(httpStatus.CONFLICT, 'A category with this slug already exists');
  }
};

const CreateCategory = async (input: CreateInput) => {
  const slug = input.slug ?? (slugify(pickName(input.translations), { lower: true, strict: true }) || 'category');
  await assertSlugFree(slug);
  await assertNamesFree(input.translations);
  const category = await prisma.projectCategory.create({
    data: { slug, translations: { create: input.translations } },
    include,
  });
  return withName(category);
};

const GetAllCategories = async () => {
  const categories = await prisma.projectCategory.findMany({ include });
  return categories.map(withName).sort((a, b) => a.name.localeCompare(b.name));
};

/** Accepts a numeric id or a slug. */
const GetCategory = async (idOrSlug: string) => {
  const isId = /^\d+$/.test(idOrSlug);
  const category = await prisma.projectCategory.findUnique({
    where: isId ? { id: Number(idOrSlug) } : { slug: idOrSlug },
    include,
  });
  if (!category) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  return withName(category);
};

const UpdateCategory = async (id: number, input: UpdateInput) => {
  const existing = await prisma.projectCategory.findUnique({ where: { id } });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  if (input.slug && input.slug !== existing.slug) await assertSlugFree(input.slug, id);
  if (input.translations) await assertNamesFree(input.translations, id);

  await prisma.$transaction(async (tx) => {
    // Upsert only the languages that were sent; the others are left untouched.
    for (const { lang, name } of input.translations ?? []) {
      await tx.projectCategoryTranslation.upsert({
        where: { categoryId_lang: { categoryId: id, lang } },
        create: { categoryId: id, lang, name },
        update: { name },
      });
    }
    if (input.slug) await tx.projectCategory.update({ where: { id }, data: { slug: input.slug } });
  });
  return GetCategory(String(id));
};

const DeleteCategory = async (id: number) => {
  const existing = await prisma.projectCategory.findUnique({ where: { id }, include });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  if (existing._count.projects > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This category has ${existing._count.projects} project(s). Move them to another category before deleting it.`,
    );
  }
  await prisma.projectCategory.delete({ where: { id } }); // translations cascade
};

export const ProjectCategoryService = { CreateCategory, GetAllCategories, GetCategory, UpdateCategory, DeleteCategory };
