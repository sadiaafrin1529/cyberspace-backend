import { Router } from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { ApiKeyController } from './apiKey.controller';

/**
 * Key management for the Settings page. Website JWT only, ADMIN only.
 * An API key can never authenticate here: `auth` requires a signed JWT of an active ADMIN user.
 */
const router = Router();

router.use(auth(Role.ADMIN));

router.get('/meta', ApiKeyController.GetMeta);
router.get('/logs', ApiKeyController.ListLogs);
router.get('/', ApiKeyController.ListKeys);
router.post('/', ApiKeyController.CreateKey);
router.get('/:id/secret', ApiKeyController.RevealKey);
router.patch('/:id',ApiKeyController.UpdateKey);
router.post('/:id/revoke', ApiKeyController.RevokeKey);

export const apiKeyRouter = router;
