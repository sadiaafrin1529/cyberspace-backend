import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { ProjectCategoryService } from './projectCategory.service';
import { createProjectCategorySchema, updateProjectCategorySchema } from './projectCategory.validation';

const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid id');
  return n;
};

const CreateCategory = catchAsync(async (req, res) => {
  const result = await ProjectCategoryService.CreateCategory(createProjectCategorySchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Category created', data: result });
});

const GetAllCategories = catchAsync(async (_req, res) => {
  const result = await ProjectCategoryService.GetAllCategories();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Categories retrieved', data: result });
});

const GetCategory = catchAsync(async (req, res) => {
  const result = await ProjectCategoryService.GetCategory(String(req.params.idOrSlug));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Category retrieved', data: result });
});

const UpdateCategory = catchAsync(async (req, res) => {
  const result = await ProjectCategoryService.UpdateCategory(id(req.params.id), updateProjectCategorySchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Category updated', data: result });
});

const DeleteCategory = catchAsync(async (req, res) => {
  await ProjectCategoryService.DeleteCategory(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Category deleted' });
});

export const ProjectCategoryController = { CreateCategory, GetAllCategories, GetCategory, UpdateCategory, DeleteCategory };
