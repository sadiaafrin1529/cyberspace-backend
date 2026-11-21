import { Router } from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { ProjectCategoryController } from './projectCategory.controller';

const router = Router();

// Public
router.get('/', ProjectCategoryController.GetAllCategories);
router.get('/:idOrSlug', ProjectCategoryController.GetCategory);

// Admin
router.post('/', auth(Role.ADMIN), ProjectCategoryController.CreateCategory);
router.patch('/:id', auth(Role.ADMIN), ProjectCategoryController.UpdateCategory);
router.delete('/:id', auth(Role.ADMIN), ProjectCategoryController.DeleteCategory);

export const projectCategoryRouter = router;
