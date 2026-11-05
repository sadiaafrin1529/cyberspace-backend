import fs from 'fs';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CareerApplicationStatus } from '@prisma/client';

interface ICreateCareerApplication {
  fullName: string;
  email: string;
  phone: string;
  positionApplied: string;
  country?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  yearsExperience?: number;
  coverLetter?: string;
  resumePath: string;
  resumeFileName: string;
}

const SAFE_SELECT = {
  id: true, fullName: true, email: true, phone: true, positionApplied: true,
  country: true, linkedinUrl: true, portfolioUrl: true, yearsExperience: true,
  coverLetter: true, resumeFileName: true, status: true, createdAt: true,
} as const;

const CreateApplication = async (data: ICreateCareerApplication) => {
  const existing = await prisma.careerApplication.findFirst({
    where: { email: data.email, positionApplied: data.positionApplied },
  });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'You have already applied for this position with this email.');
  }
  return prisma.careerApplication.create({ data, select: SAFE_SELECT });
};

const GetAllApplications = async () => {
  return prisma.careerApplication.findMany({ orderBy: { createdAt: 'desc' }, select: SAFE_SELECT });
};

const GetApplicationById = async (id: number) => {
  const app = await prisma.careerApplication.findUnique({ where: { id }, select: SAFE_SELECT });
  if (!app) throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  return app;
};

const GetApplicationResumeFile = async (id: number) => {
  const app = await prisma.careerApplication.findUnique({
    where: { id },
    select: { resumePath: true, resumeFileName: true },
  });
  if (!app) throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  return app;
};

const UpdateApplicationStatus = async (id: number, status: CareerApplicationStatus) => {
  const app = await prisma.careerApplication.findUnique({ where: { id } });
  if (!app) throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  return prisma.careerApplication.update({ where: { id }, data: { status }, select: SAFE_SELECT });
};

const DeleteApplication = async (id: number) => {
  const app = await prisma.careerApplication.findUnique({ where: { id } });
  if (!app) throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  await prisma.careerApplication.delete({ where: { id } });
  fs.unlink(app.resumePath, () => {});
  return app;
};

export const CareerApplicationService = {
  CreateApplication, GetAllApplications, GetApplicationById, GetApplicationResumeFile, UpdateApplicationStatus, DeleteApplication,
};
