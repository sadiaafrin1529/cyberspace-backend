import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface ICareerOpportunity {
  titleAZ: string;
  titleEN: string;
  titleRU: string;
  department?: string;
  location?: string;
  typeAZ?: string;
  typeEN?: string;
  typeRU?: string;
  descAZ?: string;
  descEN?: string;
  descRU?: string;
  isActive?: boolean;
  order?: number;
}

const GetAllOpportunities = async () => {
  return prisma.careerOpportunity.findMany({ orderBy: { order: 'asc' } });
};

const GetActiveOpportunities = async () => {
  return prisma.careerOpportunity.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
};

const GetOpportunityById = async (id: number) => {
  const o = await prisma.careerOpportunity.findUnique({ where: { id } });
  if (!o) throw new AppError(httpStatus.NOT_FOUND, 'Opportunity not found');
  return o;
};

const CreateOpportunity = async (data: ICareerOpportunity) => {
  return prisma.careerOpportunity.create({ data });
};

const UpdateOpportunity = async (id: number, data: Partial<ICareerOpportunity>) => {
  const o = await prisma.careerOpportunity.findUnique({ where: { id } });
  if (!o) throw new AppError(httpStatus.NOT_FOUND, 'Opportunity not found');
  return prisma.careerOpportunity.update({ where: { id }, data });
};

const DeleteOpportunity = async (id: number) => {
  const o = await prisma.careerOpportunity.findUnique({ where: { id } });
  if (!o) throw new AppError(httpStatus.NOT_FOUND, 'Opportunity not found');
  await prisma.careerOpportunity.delete({ where: { id } });
};

export const CareerOpportunityService = { GetAllOpportunities, GetActiveOpportunities, GetOpportunityById, CreateOpportunity, UpdateOpportunity, DeleteOpportunity };
