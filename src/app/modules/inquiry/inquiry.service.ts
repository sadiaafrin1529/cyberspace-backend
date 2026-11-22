import prisma from '../../utils/prisma';
import { InquiryStatus } from '@prisma/client';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface CreateInquiryData {
  productId?: string;
  bundleId?: number;
  name: string;
  phone: string;
  message?: string;
  submittedById?: number;
}

const bundleInclude = { translations: { select: { lang: true, title: true } } } as const;

const CreateInquiry = async (data: CreateInquiryData) => {
  // An inquiry is about exactly one thing: a product or a solution bundle.
  const hasProduct = !!data.productId;
  const hasBundle = data.bundleId !== undefined && data.bundleId !== null;
  if (hasProduct === hasBundle) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide either productId or bundleId');
  }
  if (hasProduct) {
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  } else {
    const bundleId = Number(data.bundleId);
    const bundle = await prisma.solutionBundle.findFirst({
      where: { id: bundleId, isActive: true, section: { isActive: true, category: { isActive: true } } },
    });
    if (!bundle) throw new AppError(httpStatus.NOT_FOUND, 'Solution bundle not found');
  }
  return prisma.inquiry.create({
    data: {
      productId: hasProduct ? data.productId : null,
      bundleId: hasBundle ? Number(data.bundleId) : null,
      name: data.name,
      phone: data.phone,
      message: data.message,
      submittedById: data.submittedById,
      status: 'NEW',
    },
    include: {
      product: { include: { translations: true } },
      bundle: { include: bundleInclude },
    },
  });
};

const GetAllInquiries = async () => {
  return prisma.inquiry.findMany({
    include: {
      product: { include: { translations: true } },
      bundle: { include: bundleInclude },
      submittedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const GetInquiriesByUser = async (userId: number) => {
  return prisma.inquiry.findMany({
    where: { submittedById: userId },
    include: {
      product: { include: { translations: true } },
      bundle: { include: bundleInclude },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const GetInquiryById = async (id: number) => {
  return prisma.inquiry.findUnique({
    where: { id },
    include: {
      product: { include: { translations: true } },
      bundle: { include: bundleInclude },
      submittedBy: { select: { id: true, name: true, email: true } },
    },
  });
};

const UpdateInquiryStatus = async (id: number, status: InquiryStatus) => {
  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) {
    throw new AppError(httpStatus.NOT_FOUND, 'Inquiry not found');
  }
  return prisma.inquiry.update({
    where: { id },
    data: { status },
    include: {
      product: { include: { translations: true } },
      bundle: { include: bundleInclude },
    },
  });
};

export const InquiryService = {
  CreateInquiry,
  GetAllInquiries,
  GetInquiriesByUser,
  GetInquiryById,
  UpdateInquiryStatus,
};
