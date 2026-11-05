import { Router } from 'express';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';
import { uploadResume } from '../../utils/uploadResumeMiddleware';
import { CareerPageController } from './careerPage.controller';
import { CareerBenefitController } from './careerBenefit.controller';
import { CareerExpertiseController } from './careerExpertise.controller';
import { CareerGalleryController } from './careerGallery.controller';
import { CareerOpportunityController } from './careerOpportunity.controller';
import { CareerApplicationController } from './careerApplication.controller';

const router = Router();

// Page settings (singleton)
router.get('/page', CareerPageController.GetCareerPage);
router.patch('/page', auth(Role.ADMIN), CareerPageController.UpdateCareerPage);

// Benefits
router.get('/benefits', CareerBenefitController.GetAllBenefits);
router.get('/benefits/active', CareerBenefitController.GetActiveBenefits);
router.get('/benefits/:id', auth(Role.ADMIN), CareerBenefitController.GetBenefitById);
router.post('/benefits', auth(Role.ADMIN), CareerBenefitController.CreateBenefit);
router.patch('/benefits/:id', auth(Role.ADMIN), CareerBenefitController.UpdateBenefit);
router.delete('/benefits/:id', auth(Role.ADMIN), CareerBenefitController.DeleteBenefit);

// Expertise
router.get('/expertise', CareerExpertiseController.GetAllExpertise);
router.get('/expertise/active', CareerExpertiseController.GetActiveExpertise);
router.get('/expertise/:id', auth(Role.ADMIN), CareerExpertiseController.GetExpertiseById);
router.post('/expertise', auth(Role.ADMIN), CareerExpertiseController.CreateExpertise);
router.patch('/expertise/:id', auth(Role.ADMIN), CareerExpertiseController.UpdateExpertise);
router.delete('/expertise/:id', auth(Role.ADMIN), CareerExpertiseController.DeleteExpertise);

// Gallery
router.get('/gallery', CareerGalleryController.GetAllGalleryImages);
router.get('/gallery/active', CareerGalleryController.GetActiveGalleryImages);
router.get('/gallery/:id', auth(Role.ADMIN), CareerGalleryController.GetGalleryImageById);
router.post('/gallery', auth(Role.ADMIN), CareerGalleryController.CreateGalleryImage);
router.patch('/gallery/:id', auth(Role.ADMIN), CareerGalleryController.UpdateGalleryImage);
router.delete('/gallery/:id', auth(Role.ADMIN), CareerGalleryController.DeleteGalleryImage);

// Opportunities
router.get('/opportunities', CareerOpportunityController.GetAllOpportunities);
router.get('/opportunities/active', CareerOpportunityController.GetActiveOpportunities);
router.get('/opportunities/:id', auth(Role.ADMIN), CareerOpportunityController.GetOpportunityById);
router.post('/opportunities', auth(Role.ADMIN), CareerOpportunityController.CreateOpportunity);
router.patch('/opportunities/:id', auth(Role.ADMIN), CareerOpportunityController.UpdateOpportunity);
router.delete('/opportunities/:id', auth(Role.ADMIN), CareerOpportunityController.DeleteOpportunity);

// Applications
router.post('/applications', uploadResume.single('resume'), CareerApplicationController.CreateApplication);
router.get('/applications', auth(Role.ADMIN), CareerApplicationController.GetAllApplications);
router.get('/applications/:id', auth(Role.ADMIN), CareerApplicationController.GetApplicationById);
router.get('/applications/:id/resume', auth(Role.ADMIN), CareerApplicationController.DownloadResume);
router.patch('/applications/:id/status', auth(Role.ADMIN), CareerApplicationController.UpdateApplicationStatus);
router.delete('/applications/:id', auth(Role.ADMIN), CareerApplicationController.DeleteApplication);

export const careerRouter = router;
