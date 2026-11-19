import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { SolutionService } from './solution.service';
import {
  createSolutionSchema,
  updateSolutionSchema,
  solutionStatusSchema,
  solutionOrderSchema,
  solutionListQuerySchema,
} from './solution.validation';

const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid id');
  return n;
};

const CreateSolution = catchAsync(async (req, res) => {
  const result = await SolutionService.CreateSolution(createSolutionSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Solution created', data: result });
});

const GetAllSolutions = catchAsync(async (req, res) => {
  const { data, meta } = await SolutionService.GetAllSolutions(solutionListQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Solutions retrieved', meta, data });
});

const GetSolutionById = catchAsync(async (req, res) => {
  const result = await SolutionService.GetSolutionById(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Solution retrieved', data: result });
});

const GetActiveSolutions = catchAsync(async (_req, res) => {
  const result = await SolutionService.GetActiveSolutions();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Active solutions retrieved', data: result });
});

const GetActiveSolutionBySlug = catchAsync(async (req, res) => {
  const result = await SolutionService.GetActiveSolutionBySlug(String(req.params.slug));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Solution retrieved', data: result });
});

const UpdateSolution = catchAsync(async (req, res) => {
  const result = await SolutionService.UpdateSolution(id(req.params.id), updateSolutionSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Solution updated', data: result });
});

const SetSolutionStatus = catchAsync(async (req, res) => {
  const { isActive } = solutionStatusSchema.parse(req.body);
  const result = await SolutionService.SetSolutionStatus(id(req.params.id), isActive);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Solution status updated', data: result });
});

const SetSolutionOrder = catchAsync(async (req, res) => {
  const { order } = solutionOrderSchema.parse(req.body);
  const result = await SolutionService.SetSolutionOrder(id(req.params.id), order);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Solution order updated', data: result });
});

const DeleteSolution = catchAsync(async (req, res) => {
  await SolutionService.DeleteSolution(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Solution deleted' });
});

export const SolutionController = {
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
