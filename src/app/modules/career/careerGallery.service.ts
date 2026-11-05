import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface ICareerGalleryImage {
  imageUrl: string;
  captionAZ?: string;
  captionEN?: string;
  captionRU?: string;
  isActive?: boolean;
  order?: number;
}

const GetAllGalleryImages = async () => {
  return prisma.careerGalleryImage.findMany({ orderBy: { order: 'asc' } });
};

const GetActiveGalleryImages = async () => {
  return prisma.careerGalleryImage.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
};

const GetGalleryImageById = async (id: number) => {
  const g = await prisma.careerGalleryImage.findUnique({ where: { id } });
  if (!g) throw new AppError(httpStatus.NOT_FOUND, 'Gallery image not found');
  return g;
};

const CreateGalleryImage = async (data: ICareerGalleryImage) => {
  return prisma.careerGalleryImage.create({ data });
};

const UpdateGalleryImage = async (id: number, data: Partial<ICareerGalleryImage>) => {
  const g = await prisma.careerGalleryImage.findUnique({ where: { id } });
  if (!g) throw new AppError(httpStatus.NOT_FOUND, 'Gallery image not found');
  return prisma.careerGalleryImage.update({ where: { id }, data });
};

const DeleteGalleryImage = async (id: number) => {
  const g = await prisma.careerGalleryImage.findUnique({ where: { id } });
  if (!g) throw new AppError(httpStatus.NOT_FOUND, 'Gallery image not found');
  await prisma.careerGalleryImage.delete({ where: { id } });
};

export const CareerGalleryService = { GetAllGalleryImages, GetActiveGalleryImages, GetGalleryImageById, CreateGalleryImage, UpdateGalleryImage, DeleteGalleryImage };
