import httpStatus from 'http-status';
import slugify from 'slugify';
import { Request } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import prisma from '../../utils/prisma';
import { CategoryService } from '../category/category.service';
import { ProductService } from '../product/product.service';
import { ApiError } from './externalApi.support';
import {
  externalCreateCategorySchema,
  externalCreateProductSchema,
  externalUpdateCategorySchema,
  externalUpdateProductSchema,
  idParam,
  listCategoriesQuery,
  listProductsQuery,
  uuidParam,
} from './externalApi.validation';

const body = (req: Request) => {
  if (req.body === undefined || req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_BODY', 'Request body must be a JSON object (Content-Type: application/json).');
  }
  return req.body;
};

// ---------------------------------------------------------------- categories
// All business rules (slug uniqueness, parent exists, no cycles, no delete with children)
// live in CategoryService and are shared with the website admin panel.

const ListCategories = catchAsync(async (req, res) => {
  const { tree, activeOnly } = listCategoriesQuery.parse(req.query);
  const data = await CategoryService.GetAllCategories({ tree, activeOnly });
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Categories retrieved', data });
});

const GetCategory = catchAsync(async (req, res) => {
  const data = await CategoryService.GetCategoryById(idParam.parse(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Category retrieved', data });
});

const CreateCategory = catchAsync(async (req, res) => {
  const { parentSlug, slug, ...input } = externalCreateCategorySchema.parse(body(req));

  let parentId = input.parentId ?? null;
  if (parentSlug) {
    const parent = await prisma.category.findUnique({ where: { slug: parentSlug }, select: { id: true } });
    if (!parent) throw new ApiError(httpStatus.NOT_FOUND, 'PARENT_NOT_FOUND', `Parent category "${parentSlug}" not found`);
    if (parentId !== null && parentId !== parent.id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'PARENT_MISMATCH', 'parentId and parentSlug refer to different categories');
    }
    parentId = parent.id;
  }

  const finalSlug = slug ?? slugify(input.nameEN, { lower: true, strict: true, trim: true });
  if (finalSlug.length < 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'SLUG_REQUIRED', 'Could not derive a slug from nameEN. Provide "slug" explicitly.');
  }

  const data = await CategoryService.CreateCategory({ ...input, slug: finalSlug.slice(0, 80), parentId });
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Category created', data });
});

const UpdateCategory = catchAsync(async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = externalUpdateCategorySchema.parse(body(req));
  const current = await CategoryService.GetCategoryById(id);
  // Products reference categories by slug, so renaming the slug would silently orphan them.
  if (input.slug && input.slug !== current.slug) {
    const used = await prisma.product.count({ where: { category: current.slug } });
    if (used > 0) {
      throw new ApiError(httpStatus.CONFLICT, 'CATEGORY_IN_USE', `Cannot change the slug: ${used} product(s) reference "${current.slug}".`);
    }
  }
  const data = await CategoryService.UpdateCategory(id, input);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Category updated', data });
});

const DeleteCategory = catchAsync(async (req, res) => {
  const id = idParam.parse(req.params.id);
  const current = await CategoryService.GetCategoryById(id);
  const used = await prisma.product.count({ where: { category: current.slug } });
  if (used > 0) {
    throw new ApiError(httpStatus.CONFLICT, 'CATEGORY_IN_USE', `Cannot delete: ${used} product(s) still use this category.`);
  }
  await CategoryService.DeleteCategory(id); // also refuses when sub-categories exist
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Category deleted' });
});

// ------------------------------------------------------------------ products
// Create/update/delete go through ProductService (the website's own code path).

const ListProducts = catchAsync(async (req, res) => {
  const { page, limit, ...filter } = listProductsQuery.parse(req.query);
  const { items, meta } = await ProductService.ListProductsPaged(filter, page, limit);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Products retrieved', data: items, meta });
});

const requireFound = <T>(value: T | null, what: string): T => {
  if (value === null) throw new ApiError(httpStatus.NOT_FOUND, 'NOT_FOUND', `${what} not found`);
  return value;
};

const GetProduct = catchAsync(async (req, res) => {
  const data = requireFound(await ProductService.GetProductById(uuidParam.parse(req.params.id)), 'Product');
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Product retrieved', data });
});

const GetProductBySku = catchAsync(async (req, res) => {
  const data = requireFound(await ProductService.GetProductBySku(uuidParam.parse(req.params.sku)), 'Product');
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Product retrieved', data });
});

const CreateProduct = catchAsync(async (req, res) => {
  const data = await ProductService.CreateProduct(externalCreateProductSchema.parse(body(req)));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Product created', data });
});

const UpdateProduct = catchAsync(async (req, res) => {
  const data = await ProductService.UpdateProduct(uuidParam.parse(req.params.id), externalUpdateProductSchema.parse(body(req)));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Product updated', data });
});

const DeleteProduct = catchAsync(async (req, res) => {
  await ProductService.DeleteProduct(uuidParam.parse(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Product deleted' });
});

export const ExternalApiController = {
  ListCategories,
  GetCategory,
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  ListProducts,
  GetProduct,
  GetProductBySku,
  CreateProduct,
  UpdateProduct,
  DeleteProduct,
};
