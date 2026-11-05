import catchAsync from '../../utils/catchAsync';
import { CareerPageService } from './careerPage.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const GetCareerPage = catchAsync(async (_req, res) => {
  const result = await CareerPageService.GetCareerPage();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Career page retrieved', data: result });
});

const UpdateCareerPage = catchAsync(async (req, res) => {
  const result = await CareerPageService.UpdateCareerPage(req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Career page updated', data: result });
});

export const CareerPageController = { GetCareerPage, UpdateCareerPage };
