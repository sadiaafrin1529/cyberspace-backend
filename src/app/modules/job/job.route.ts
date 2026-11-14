import { Router } from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { JobController } from './job.controller';

const router = Router();

// Public: only published, non-expired jobs
router.get('/active', JobController.GetActiveJobs);
router.get('/active/:slug', JobController.GetActiveJobBySlug);

// Admin
router.get('/stats', auth(Role.ADMIN), JobController.GetStats);
router.get('/', auth(Role.ADMIN), JobController.GetAllJobs);
router.get('/:id', auth(Role.ADMIN), JobController.GetJobById);
router.post('/', auth(Role.ADMIN), JobController.CreateJob);
router.patch('/:id/status', auth(Role.ADMIN), JobController.SetJobStatus);
router.patch('/:id', auth(Role.ADMIN), JobController.UpdateJob);
router.delete('/:id', auth(Role.ADMIN), JobController.DeleteJob);

export const jobRouter = router;
