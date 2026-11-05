import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

type ICareerPageInput = Omit<Prisma.CareerPageUncheckedCreateInput, 'id' | 'updatedAt'>;

const GetCareerPage = async () => {
  const page = await prisma.careerPage.findUnique({ where: { id: 1 } });
  if (page) return page;
  return prisma.careerPage.create({ data: { id: 1 } });
};

const UpdateCareerPage = async (data: Partial<ICareerPageInput>) => {
  return prisma.careerPage.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
};

export const CareerPageService = { GetCareerPage, UpdateCareerPage };
