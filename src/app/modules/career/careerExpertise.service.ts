import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface ICareerExpertise {
  icon?: string;
  titleAZ: string;
  titleEN: string;
  titleRU: string;
  descAZ?: string;
  descEN?: string;
  descRU?: string;
  isActive?: boolean;
  order?: number;
}

const GetAllExpertise = async () => {
  return prisma.careerExpertise.findMany({ orderBy: { order: 'asc' } });
};

const GetActiveExpertise = async () => {
  return prisma.careerExpertise.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
};

const GetExpertiseById = async (id: number) => {
  const e = await prisma.careerExpertise.findUnique({ where: { id } });
  if (!e) throw new AppError(httpStatus.NOT_FOUND, 'Expertise not found');
  return e;
};

const CreateExpertise = async (data: ICareerExpertise) => {
  return prisma.careerExpertise.create({ data });
};

const UpdateExpertise = async (id: number, data: Partial<ICareerExpertise>) => {
  const e = await prisma.careerExpertise.findUnique({ where: { id } });
  if (!e) throw new AppError(httpStatus.NOT_FOUND, 'Expertise not found');
  return prisma.careerExpertise.update({ where: { id }, data });
};

const DeleteExpertise = async (id: number) => {
  const e = await prisma.careerExpertise.findUnique({ where: { id } });
  if (!e) throw new AppError(httpStatus.NOT_FOUND, 'Expertise not found');
  await prisma.careerExpertise.delete({ where: { id } });
};

export const CareerExpertiseService = { GetAllExpertise, GetActiveExpertise, GetExpertiseById, CreateExpertise, UpdateExpertise, DeleteExpertise };
