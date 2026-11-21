import { Router } from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { ProjectController } from './project.controller';

const router = Router();

// Public
router.get('/', ProjectController.GetAllProjects);
router.get('/:idOrSlug', ProjectController.GetProject);

// Admin
router.post('/', auth(Role.ADMIN), ProjectController.CreateProject);
router.patch('/:id', auth(Role.ADMIN), ProjectController.UpdateProject);
router.delete('/:id', auth(Role.ADMIN), ProjectController.DeleteProject);

export const projectRouter = router;
