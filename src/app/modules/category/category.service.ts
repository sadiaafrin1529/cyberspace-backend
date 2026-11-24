import { Category } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.validation';

interface ListOptions {
  /** Return nested `children` instead of a flat list. */
  tree?: boolean;
  /** Only active categories. In tree mode an inactive category hides its whole subtree. */
  activeOnly?: boolean;
}

export type CategoryNode = Category & { children: CategoryNode[] };

const ORDER = [{ order: 'asc' as const }, { id: 'asc' as const }];

function buildTree(rows: Category[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: CategoryNode[] = [];
  // rows arrive sorted by (order, id), so each children array is sorted too.
  for (const node of nodes.values()) {
    const parent = node.parentId == null ? null : nodes.get(node.parentId);
    if (parent) parent.children.push(node);
    // A missing parent means it was filtered out (inactive): drop the orphaned subtree.
    else if (node.parentId == null) roots.push(node);
  }
  return roots;
}

const GetAllCategories = async ({ tree, activeOnly }: ListOptions = {}) => {
  const rows = await prisma.category.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: ORDER,
  });
  return tree ? buildTree(rows) : rows;
};

const GetCategoryById = async (id: number) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  return category;
};

const assertSlugFree = async (slug: string, excludeId?: number) => {
  const conflict = await prisma.category.findUnique({ where: { slug } });
  if (conflict && conflict.id !== excludeId) {
    throw new AppError(httpStatus.CONFLICT, 'A category with this slug already exists');
  }
};

/** Parent must exist, must not be the category itself, and must not be one of its descendants. */
const assertValidParent = async (parentId: number, selfId?: number) => {
  if (selfId !== undefined && parentId === selfId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'A category cannot be its own parent');
  }
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const parentOf = new Map(all.map((c) => [c.id, c.parentId]));
  if (!parentOf.has(parentId)) throw new AppError(httpStatus.NOT_FOUND, 'Parent category not found');
  if (selfId === undefined) return;
  // Walk up from the proposed parent; reaching selfId means the move would create a cycle.
  const seen = new Set<number>();
  for (let cur: number | null | undefined = parentId; cur != null && !seen.has(cur); cur = parentOf.get(cur)) {
    if (cur === selfId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Cannot move a category under one of its own descendants');
    }
    seen.add(cur);
  }
};

const CreateCategory = async (data: CreateCategoryInput) => {
  await assertSlugFree(data.slug);
  if (data.parentId != null) await assertValidParent(data.parentId);
  return prisma.category.create({ data });
};

const UpdateCategory = async (id: number, data: UpdateCategoryInput) => {
  const category = await GetCategoryById(id);
  if (data.slug && data.slug !== category.slug) await assertSlugFree(data.slug, id);
  if (data.parentId != null && data.parentId !== category.parentId) await assertValidParent(data.parentId, id);
  return prisma.category.update({ where: { id }, data });
};

const DeleteCategory = async (id: number) => {
  await GetCategoryById(id);
  const childCount = await prisma.category.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Cannot delete: this category still has ${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'}. Delete or move them first.`,
    );
  }
  await prisma.category.delete({ where: { id } });
};

export const CategoryService = { GetAllCategories, GetCategoryById, CreateCategory, UpdateCategory, DeleteCategory };
