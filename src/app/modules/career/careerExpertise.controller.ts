import catchAsync from '../../utils/catchAsync';
import { CareerExpertiseService } from './careerExpertise.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const GetAllExpertise = catchAsync(async (_req, res) => {
  const result = await CareerExpertiseService.GetAllExpertise();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Expertise retrieved', data: result });
});

const GetActiveExpertise = catchAsync(async (_req, res) => {
  const result = await CareerExpertiseService.GetActiveExpertise();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Active expertise retrieved', data: result });
});

const GetExpertiseById = catchAsync(async (req, res) => {
  const result = await CareerExpertiseService.GetExpertiseById(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Expertise retrieved', data: result });
});

const CreateExpertise = catchAsync(async (req, res) => {
  const result = await CareerExpertiseService.CreateExpertise(req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Expertise created', data: result });
});

const UpdateExpertise = catchAsync(async (req, res) => {
  const result = await CareerExpertiseService.UpdateExpertise(Number(req.params.id), req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Expertise updated', data: result });
});

const DeleteExpertise = catchAsync(async (req, res) => {
  await CareerExpertiseService.DeleteExpertise(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Expertise deleted' });
});

export const CareerExpertiseController = { GetAllExpertise, GetActiveExpertise, GetExpertiseById, CreateExpertise, UpdateExpertise, DeleteExpertise };
