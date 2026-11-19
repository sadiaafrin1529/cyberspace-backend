import { Router } from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { SolutionController } from './solution.controller';

const router = Router();

// Public: only active solutions
router.get('/active', SolutionController.GetActiveSolutions);
router.get('/active/:slug', SolutionController.GetActiveSolutionBySlug);

// Admin
router.get('/', auth(Role.ADMIN), SolutionController.GetAllSolutions);
router.get('/:id', auth(Role.ADMIN), SolutionController.GetSolutionById);
router.post('/', auth(Role.ADMIN), SolutionController.CreateSolution);
router.patch('/:id/status', auth(Role.ADMIN), SolutionController.SetSolutionStatus);
router.patch('/:id/order', auth(Role.ADMIN), SolutionController.SetSolutionOrder);
router.patch('/:id', auth(Role.ADMIN), SolutionController.UpdateSolution);
router.delete('/:id', auth(Role.ADMIN), SolutionController.DeleteSolution);

export const solutionRouter = router;
