import catchAsync from '../../utils/catchAsync';
import { CareerGalleryService } from './careerGallery.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const GetAllGalleryImages = catchAsync(async (_req, res) => {
  const result = await CareerGalleryService.GetAllGalleryImages();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Gallery images retrieved', data: result });
});

const GetActiveGalleryImages = catchAsync(async (_req, res) => {
  const result = await CareerGalleryService.GetActiveGalleryImages();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Active gallery images retrieved', data: result });
});

const GetGalleryImageById = catchAsync(async (req, res) => {
  const result = await CareerGalleryService.GetGalleryImageById(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Gallery image retrieved', data: result });
});

const CreateGalleryImage = catchAsync(async (req, res) => {
  const result = await CareerGalleryService.CreateGalleryImage(req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Gallery image created', data: result });
});

const UpdateGalleryImage = catchAsync(async (req, res) => {
  const result = await CareerGalleryService.UpdateGalleryImage(Number(req.params.id), req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Gallery image updated', data: result });
});

const DeleteGalleryImage = catchAsync(async (req, res) => {
  await CareerGalleryService.DeleteGalleryImage(Number(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Gallery image deleted' });
});

export const CareerGalleryController = { GetAllGalleryImages, GetActiveGalleryImages, GetGalleryImageById, CreateGalleryImage, UpdateGalleryImage, DeleteGalleryImage };
