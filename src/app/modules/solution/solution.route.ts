import { Router } from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { SolutionController as C } from './solution.controller';

const router = Router();
const admin = auth(Role.ADMIN);

// Public (active content only)
router.get('/categories', C.GetPublicCategories);
router.get('/categories/:slug', C.GetPublicCategory);

// Admin: categories ("/reorder" must stay above "/:id")
router.get('/admin/categories', admin, C.GetAdminCategories);
router.post('/admin/categories', admin, C.CreateCategory);
router.patch('/admin/categories/reorder', admin, C.ReorderCategories);
router.get('/admin/categories/:id', admin, C.GetAdminCategory);
router.patch('/admin/categories/:id', admin, C.UpdateCategory);
router.delete('/admin/categories/:id', admin, C.DeleteCategory);

// Admin: sections (accordion bars inside a category)
router.get('/admin/sections', admin, C.GetAdminSections);
router.post('/admin/sections', admin, C.CreateSection);
router.patch('/admin/sections/reorder', admin, C.ReorderSections);
router.get('/admin/sections/:id', admin, C.GetAdminSection);
router.patch('/admin/sections/:id', admin, C.UpdateSection);
router.delete('/admin/sections/:id', admin, C.DeleteSection);

// Admin: bundles (items and features are part of the bundle payload)
router.get('/admin/bundles', admin, C.GetAdminBundles);
router.post('/admin/bundles', admin, C.CreateBundle);
router.patch('/admin/bundles/reorder', admin, C.ReorderBundles);
router.get('/admin/bundles/:id', admin, C.GetAdminBundle);
router.patch('/admin/bundles/:id', admin, C.UpdateBundle);
router.delete('/admin/bundles/:id', admin, C.DeleteBundle);

export const solutionRouter = router;
