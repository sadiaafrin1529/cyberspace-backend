import catchAsync from '../../utils/catchAsync';
import { CareerOpportunityService } from './careerOpportunity.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const GetAllOpportunities = catchAsync(async (_req, res) => {
  const result = await CareerOpportunityService.GetAllOpportunities();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Opportunities retrieved', data: result });
});

const GetActiveOpportunities = catchAsync(async (_req, res) => {
  const result = await CareerOpportunityService.GetActiveOpportunities();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Active opportunities retrieved', data: result });
});

const GetOpportunityById = catchAsync(async (req, res) => {
  const result = await CareerOpportunityService.GetOpportunityById(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Opportunity retrieved', data: result });
});

const CreateOpportunity = catchAsync(async (req, res) => {
  const result = await CareerOpportunityService.CreateOpportunity(req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Opportunity created', data: result });
});

const UpdateOpportunity = catchAsync(async (req, res) => {
  const result = await CareerOpportunityService.UpdateOpportunity(Number(req.params.id), req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Opportunity updated', data: result });
});

const DeleteOpportunity = catchAsync(async (req, res) => {
  await CareerOpportunityService.DeleteOpportunity(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Opportunity deleted' });
});

export const CareerOpportunityController = { GetAllOpportunities, GetActiveOpportunities, GetOpportunityById, CreateOpportunity, UpdateOpportunity, DeleteOpportunity };
