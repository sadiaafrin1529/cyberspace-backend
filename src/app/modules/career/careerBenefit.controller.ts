import catchAsync from '../../utils/catchAsync';
import { CareerBenefitService } from './careerBenefit.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const GetAllBenefits = catchAsync(async (_req, res) => {
  const result = await CareerBenefitService.GetAllBenefits();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Benefits retrieved', data: result });
});

const GetActiveBenefits = catchAsync(async (_req, res) => {
  const result = await CareerBenefitService.GetActiveBenefits();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Active benefits retrieved', data: result });
});

const GetBenefitById = catchAsync(async (req, res) => {
  const result = await CareerBenefitService.GetBenefitById(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Benefit retrieved', data: result });
});

const CreateBenefit = catchAsync(async (req, res) => {
  const result = await CareerBenefitService.CreateBenefit(req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Benefit created', data: result });
});

const UpdateBenefit = catchAsync(async (req, res) => {
  const result = await CareerBenefitService.UpdateBenefit(Number(req.params.id), req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Benefit updated', data: result });
});

const DeleteBenefit = catchAsync(async (req, res) => {
  await CareerBenefitService.DeleteBenefit(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Benefit deleted' });
});

export const CareerBenefitController = { GetAllBenefits, GetActiveBenefits, GetBenefitById, CreateBenefit, UpdateBenefit, DeleteBenefit };
