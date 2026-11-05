import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface ICareerBenefit {
  icon?: string;
  imageUrl?: string;
  titleAZ: string;
  titleEN: string;
  titleRU: string;
  descAZ?: string;
  descEN?: string;
  descRU?: string;
  isActive?: boolean;
  order?: number;
}

const GetAllBenefits = async () => {
  return prisma.careerBenefit.findMany({ orderBy: { order: 'asc' } });
};

const GetActiveBenefits = async () => {
  return prisma.careerBenefit.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
};

const GetBenefitById = async (id: number) => {
  const b = await prisma.careerBenefit.findUnique({ where: { id } });
  if (!b) throw new AppError(httpStatus.NOT_FOUND, 'Benefit not found');
  return b;
};

const CreateBenefit = async (data: ICareerBenefit) => {
  return prisma.careerBenefit.create({ data });
};

const UpdateBenefit = async (id: number, data: Partial<ICareerBenefit>) => {
  const b = await prisma.careerBenefit.findUnique({ where: { id } });
  if (!b) throw new AppError(httpStatus.NOT_FOUND, 'Benefit not found');
  return prisma.careerBenefit.update({ where: { id }, data });
};

const DeleteBenefit = async (id: number) => {
  const b = await prisma.careerBenefit.findUnique({ where: { id } });
  if (!b) throw new AppError(httpStatus.NOT_FOUND, 'Benefit not found');
  await prisma.careerBenefit.delete({ where: { id } });
};

export const CareerBenefitService = { GetAllBenefits, GetActiveBenefits, GetBenefitById, CreateBenefit, UpdateBenefit, DeleteBenefit };
