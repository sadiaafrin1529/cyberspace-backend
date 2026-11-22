import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { SolutionService } from './solution.service';
import {
  createCategorySchema,
  updateCategorySchema,
  createSectionSchema,
  updateSectionSchema,
  createBundleSchema,
  updateBundleSchema,
  reorderSchema,
  publicCategoryQuerySchema,
  adminCategoryQuerySchema,
  adminSectionQuerySchema,
  adminBundleQuerySchema,
} from './solution.validation';

const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid id');
  return n;
};

const ok = httpStatus.OK;

/* Public */
const GetPublicCategories = catchAsync(async (req, res) => {
  const data = await SolutionService.GetPublicCategories(publicCategoryQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: ok, message: 'Solution categories retrieved', data });
});

const GetPublicCategory = catchAsync(async (req, res) => {
  const data = await SolutionService.GetPublicCategory(String(req.params.slug));
  sendResponse(res, { success: true, statusCode: ok, message: 'Solution category retrieved', data });
});

/* Admin: categories */
const CreateCategory = catchAsync(async (req, res) => {
  const data = await SolutionService.CreateCategory(createCategorySchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Category created', data });
});

const GetAdminCategories = catchAsync(async (req, res) => {
  const { data, meta } = await SolutionService.GetAdminCategories(adminCategoryQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: ok, message: 'Categories retrieved', meta, data });
});

const GetAdminCategory = catchAsync(async (req, res) => {
  const data = await SolutionService.GetAdminCategory(id(req.params.id));
  sendResponse(res, { success: true, statusCode: ok, message: 'Category retrieved', data });
});

const UpdateCategory = catchAsync(async (req, res) => {
  const data = await SolutionService.UpdateCategory(id(req.params.id), updateCategorySchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: ok, message: 'Category updated', data });
});

const DeleteCategory = catchAsync(async (req, res) => {
  await SolutionService.DeleteCategory(id(req.params.id), req.query.cascade === 'true');
  sendResponse(res, { success: true, statusCode: ok, message: 'Category deleted' });
});

const ReorderCategories = catchAsync(async (req, res) => {
  await SolutionService.ReorderCategories(reorderSchema.parse(req.body).ids);
  sendResponse(res, { success: true, statusCode: ok, message: 'Order updated' });
});

/* Admin: sections */
const CreateSection = catchAsync(async (req, res) => {
  const data = await SolutionService.CreateSection(createSectionSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Section created', data });
});

const GetAdminSections = catchAsync(async (req, res) => {
  const { data, meta } = await SolutionService.GetAdminSections(adminSectionQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: ok, message: 'Sections retrieved', meta, data });
});

const GetAdminSection = catchAsync(async (req, res) => {
  const data = await SolutionService.GetAdminSection(id(req.params.id));
  sendResponse(res, { success: true, statusCode: ok, message: 'Section retrieved', data });
});

const UpdateSection = catchAsync(async (req, res) => {
  const data = await SolutionService.UpdateSection(id(req.params.id), updateSectionSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: ok, message: 'Section updated', data });
});

const DeleteSection = catchAsync(async (req, res) => {
  await SolutionService.DeleteSection(id(req.params.id), req.query.cascade === 'true');
  sendResponse(res, { success: true, statusCode: ok, message: 'Section deleted' });
});

const ReorderSections = catchAsync(async (req, res) => {
  await SolutionService.ReorderSections(reorderSchema.parse(req.body).ids);
  sendResponse(res, { success: true, statusCode: ok, message: 'Order updated' });
});

/* Admin: bundles */
const CreateBundle = catchAsync(async (req, res) => {
  const data = await SolutionService.CreateBundle(createBundleSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Bundle created', data });
});

const GetAdminBundles = catchAsync(async (req, res) => {
  const { data, meta } = await SolutionService.GetAdminBundles(adminBundleQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: ok, message: 'Bundles retrieved', meta, data });
});

const GetAdminBundle = catchAsync(async (req, res) => {
  const data = await SolutionService.GetAdminBundle(id(req.params.id));
  sendResponse(res, { success: true, statusCode: ok, message: 'Bundle retrieved', data });
});

const UpdateBundle = catchAsync(async (req, res) => {
  const data = await SolutionService.UpdateBundle(id(req.params.id), updateBundleSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: ok, message: 'Bundle updated', data });
});

const DeleteBundle = catchAsync(async (req, res) => {
  await SolutionService.DeleteBundle(id(req.params.id));
  sendResponse(res, { success: true, statusCode: ok, message: 'Bundle deleted' });
});

const ReorderBundles = catchAsync(async (req, res) => {
  await SolutionService.ReorderBundles(reorderSchema.parse(req.body).ids);
  sendResponse(res, { success: true, statusCode: ok, message: 'Order updated' });
});

export const SolutionController = {
  GetPublicCategories,
  GetPublicCategory,
  CreateCategory,
  GetAdminCategories,
  GetAdminCategory,
  UpdateCategory,
  DeleteCategory,
  ReorderCategories,
  CreateSection,
  GetAdminSections,
  GetAdminSection,
  UpdateSection,
  DeleteSection,
  ReorderSections,
  CreateBundle,
  GetAdminBundles,
  GetAdminBundle,
  UpdateBundle,
  DeleteBundle,
  ReorderBundles,
};
