import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { userRouter } from '../modules/user/user.router';
import { productRouter } from '../modules/product/product.route';
import { inquiryRouter } from '../modules/inquiry/inquiry.route';
import { settingRouter } from '../modules/setting/setting.route';
import { bannerRouter } from '../modules/banner/banner.route';
import { partnerRouter } from '../modules/partner/partner.route';
import { newsRouter } from '../modules/news/news.route';
import { uploadRouter } from '../modules/upload/upload.route';
import { categoryRouter } from '../modules/category/category.route';
import { jobRouter } from '../modules/job/job.route';
import { jobApplicationRouter } from '../modules/job/jobApplication.route';
import { solutionRouter } from '../modules/solution/solution.route';
import { projectRouter } from '../modules/project/project.route';
import { projectCategoryRouter } from '../modules/projectCategory/projectCategory.route';

import { apiKeyRouter } from '../modules/apiKey/apiKey.route';

const router = express.Router();

type Route = { path: string; route: express.Router };

const routes: Route[] = [
  { path: '/auth', route: AuthRoutes },
  { path: '/user', route: userRouter },
  { path: '/products', route: productRouter },
  { path: '/inquiries', route: inquiryRouter },
  { path: '/settings', route: settingRouter },
  { path: '/banners', route: bannerRouter },
  { path: '/partners', route: partnerRouter },
  { path: '/news', route: newsRouter },
  { path: '/upload', route: uploadRouter },
  { path: '/categories', route: categoryRouter },
  { path: '/jobs', route: jobRouter },
  { path: '/job-applications', route: jobApplicationRouter },
  { path: '/solutions', route: solutionRouter },
  { path: '/projects', route: projectRouter },
  { path: '/project-categories', route: projectCategoryRouter },
  { path: '/api-keys', route: apiKeyRouter },
];

routes.forEach((route) => router.use(route.path, route.route));

export default router;
