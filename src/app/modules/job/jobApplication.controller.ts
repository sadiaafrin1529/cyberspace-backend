import fs from 'fs';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { JobApplicationService } from './jobApplication.service';
import {
  applicationBodySchema,
  applicationListQuerySchema,
  applicationStatusSchema,
} from './job.validation';

const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid id');
  return n;
};

const Submit = catchAsync(async (req, res) => {
  const body = applicationBodySchema.parse(req.body);
  const result = await JobApplicationService.Submit(body, req.file);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Application sent successfully!',
    data: result,
  });
});

const GetAll = catchAsync(async (req, res) => {
  const { data, meta } = await JobApplicationService.GetAll(applicationListQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Applications retrieved', meta, data });
});

const GetById = catchAsync(async (req, res) => {
  const result = await JobApplicationService.GetById(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Application retrieved', data: result });
});

const UpdateStatus = catchAsync(async (req, res) => {
  const { status } = applicationStatusSchema.parse(req.body);
  const result = await JobApplicationService.UpdateStatus(id(req.params.id), status);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Status updated', data: result });
});

const DownloadCv = catchAsync(async (req, res) => {
  const { filePath, name, mime } = await JobApplicationService.GetCv(id(req.params.id));
  if (!fs.existsSync(filePath)) throw new AppError(httpStatus.NOT_FOUND, 'CV file is missing');
  res.setHeader('Content-Type', mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="cv"; filename*=UTF-8''${encodeURIComponent(name)}`,
  );
  fs.createReadStream(filePath).pipe(res);
});

const ResendEmail = catchAsync(async (req, res) => {
  const result = await JobApplicationService.ResendEmail(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Email retry finished', data: result });
});

export const JobApplicationController = {
  Submit,
  GetAll,
  GetById,
  UpdateStatus,
  DownloadCv,
  ResendEmail,
};
