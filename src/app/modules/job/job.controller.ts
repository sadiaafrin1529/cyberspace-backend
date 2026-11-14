import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { JobService } from './job.service';
import {
  createJobSchema,
  updateJobSchema,
  jobStatusSchema,
  jobListQuerySchema,
} from './job.validation';

const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid id');
  return n;
};

const CreateJob = catchAsync(async (req, res) => {
  const result = await JobService.CreateJob(createJobSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Job created', data: result });
});

const GetAllJobs = catchAsync(async (req, res) => {
  const { data, meta } = await JobService.GetAllJobs(jobListQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Jobs retrieved', meta, data });
});

const GetStats = catchAsync(async (_req, res) => {
  const result = await JobService.GetStats();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Recruitment statistics', data: result });
});

const GetActiveJobs = catchAsync(async (_req, res) => {
  const result = await JobService.GetActiveJobs();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Active jobs retrieved', data: result });
});

const GetActiveJobBySlug = catchAsync(async (req, res) => {
  const result = await JobService.GetActiveJobBySlug(String(req.params.slug));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Job retrieved', data: result });
});

const GetJobById = catchAsync(async (req, res) => {
  const result = await JobService.GetJobById(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Job retrieved', data: result });
});

const UpdateJob = catchAsync(async (req, res) => {
  const result = await JobService.UpdateJob(id(req.params.id), updateJobSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Job updated', data: result });
});

const SetJobStatus = catchAsync(async (req, res) => {
  const { status } = jobStatusSchema.parse(req.body);
  const result = await JobService.SetJobStatus(id(req.params.id), status);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Job status updated', data: result });
});

const DeleteJob = catchAsync(async (req, res) => {
  await JobService.DeleteJob(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Job deleted' });
});

export const JobController = {
  CreateJob,
  GetAllJobs,
  GetStats,
  GetActiveJobs,
  GetActiveJobBySlug,
  GetJobById,
  UpdateJob,
  SetJobStatus,
  DeleteJob,
};
