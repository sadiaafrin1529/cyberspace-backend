import { Request, Response } from 'express';
import path from 'path';
import catchAsync from '../../utils/catchAsync';
import { CareerApplicationService } from './careerApplication.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { CareerApplicationStatus } from '@prisma/client';

const CreateApplication = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(httpStatus.BAD_REQUEST, 'Resume file (PDF) is required');
  const { fullName, email, phone, positionApplied, country, linkedinUrl, portfolioUrl, yearsExperience, coverLetter } = req.body;
  if (!fullName || !email || !phone || !positionApplied) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Full name, email, phone and position are required');
  }
  const result = await CareerApplicationService.CreateApplication({
    fullName, email, phone, positionApplied,
    country: country || undefined,
    linkedinUrl: linkedinUrl || undefined,
    portfolioUrl: portfolioUrl || undefined,
    yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
    coverLetter: coverLetter || undefined,
    resumePath: req.file.path,
    resumeFileName: req.file.originalname,
  });
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Application submitted', data: result });
});

const GetAllApplications = catchAsync(async (_req, res) => {
  const result = await CareerApplicationService.GetAllApplications();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Applications retrieved', data: result });
});

const GetApplicationById = catchAsync(async (req, res) => {
  const result = await CareerApplicationService.GetApplicationById(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Application retrieved', data: result });
});

const DownloadResume = catchAsync(async (req: Request, res: Response) => {
  const { resumePath, resumeFileName } = await CareerApplicationService.GetApplicationResumeFile(Number(req.params.id));
  res.download(path.resolve(resumePath), resumeFileName);
});

const UpdateApplicationStatus = catchAsync(async (req, res) => {
  const { status } = req.body as { status: CareerApplicationStatus };
  const result = await CareerApplicationService.UpdateApplicationStatus(Number(req.params.id), status);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Status updated', data: result });
});

const DeleteApplication = catchAsync(async (req, res) => {
  await CareerApplicationService.DeleteApplication(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Application deleted' });
});

export const CareerApplicationController = {
  CreateApplication, GetAllApplications, GetApplicationById, DownloadResume, UpdateApplicationStatus, DeleteApplication,
};
