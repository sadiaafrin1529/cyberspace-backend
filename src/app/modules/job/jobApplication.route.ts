import { Router } from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import rateLimit from '../../utils/rateLimit';
import { uploadCv } from '../../utils/uploadCvMiddleware';
import { JobApplicationController } from './jobApplication.controller';

const router = Router();

// Public: submit an application (10 per IP per hour)
router.post('/', rateLimit(10, 60 * 60 * 1000), uploadCv, JobApplicationController.Submit);

// Admin
router.get('/', auth(Role.ADMIN), JobApplicationController.GetAll);
router.get('/:id/cv', auth(Role.ADMIN), JobApplicationController.DownloadCv);
router.post('/:id/resend-email', auth(Role.ADMIN), JobApplicationController.ResendEmail);
router.patch('/:id/status', auth(Role.ADMIN), JobApplicationController.UpdateStatus);
router.get('/:id', auth(Role.ADMIN), JobApplicationController.GetById);

export const jobApplicationRouter = router;
