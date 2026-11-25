import express, { ErrorRequestHandler, Router } from 'express';
import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import AppError from '../../errors/AppError';
import { ApiError } from './externalApi.support';
import { MAX_REQUEST_BYTES } from '../apiKey/apiKey.service';
import {
  authenticateApiKey,
  idempotency,
  preAuthRateLimit,
  requestLogger,
  requirePermission,
} from './externalApi.middleware';
import { ExternalApiController as C } from './externalApi.controller';

/**
 * Developer API, mounted at /api/v1 BEFORE the website's global body parsers and CORS.
 * Order matters: log -> IP throttle -> authenticate -> (only then) parse the JSON body.
 * No CORS headers are sent on purpose: API keys are for servers, never for browsers.
 */
const router = Router();

router.use(requestLogger);
router.use(preAuthRateLimit);
router.use(authenticateApiKey);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.use(express.json({ limit: MAX_REQUEST_BYTES }));
router.use(idempotency);

router.get('/categories', requirePermission('categories:read'), C.ListCategories);
router.get('/categories/:id', requirePermission('categories:read'), C.GetCategory);
router.post('/categories', requirePermission('categories:create'), C.CreateCategory);
router.patch('/categories/:id', requirePermission('categories:update'), C.UpdateCategory);
router.delete('/categories/:id', requirePermission('categories:delete'), C.DeleteCategory);

router.get('/products', requirePermission('products:read'), C.ListProducts);
router.get('/products/sku/:sku', requirePermission('products:read'), C.GetProductBySku); // before /:id
router.get('/products/:id', requirePermission('products:read'), C.GetProduct);
router.post('/products', requirePermission('products:create'), C.CreateProduct);
router.patch('/products/:id', requirePermission('products:update'), C.UpdateProduct);
router.delete('/products/:id', requirePermission('products:delete'), C.DeleteProduct);

router.use((_req, _res, next) => next(new ApiError(httpStatus.NOT_FOUND, 'ENDPOINT_NOT_FOUND', 'Endpoint not found')));

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  let status: number = httpStatus.INTERNAL_SERVER_ERROR;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: { path: string; message: string }[] = [];
  let logMessage: string | undefined;

  if (err instanceof ApiError) {
    ({ statusCode: status, code, message } = err);
  } else if (err instanceof ZodError) {
    status = httpStatus.BAD_REQUEST;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    logMessage = `Validation failed: ${[...new Set(details.map((d) => d.path || '(body)'))].join(', ')}`; // paths only, never values
  } else if (err instanceof AppError) {
    status = err.statusCode;
    code = status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : status === 400 ? 'BAD_REQUEST' : 'ERROR';
    message = err.message;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = httpStatus.CONFLICT;
      code = 'CONFLICT';
      const target = err.meta?.target;
      message = `A record with this ${Array.isArray(target) ? target.join(', ') : String(target ?? 'value')} already exists`;
    } else if (err.code === 'P2003') {
      status = httpStatus.CONFLICT;
      code = 'IN_USE';
      message = 'This record is still referenced by other data (for example customer inquiries).';
    } else if (err.code === 'P2025') {
      status = httpStatus.NOT_FOUND;
      code = 'NOT_FOUND';
      message = 'Record not found';
    }
  } else if (err?.type === 'entity.too.large') {
    status = httpStatus.REQUEST_ENTITY_TOO_LARGE;
    code = 'PAYLOAD_TOO_LARGE';
    message = `Request body exceeds ${MAX_REQUEST_BYTES / 1024} KB`;
  } else if (err?.type === 'entity.parse.failed') {
    status = httpStatus.BAD_REQUEST;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else if (err?.type === 'charset.unsupported' || err?.type === 'encoding.unsupported') {
    status = httpStatus.UNSUPPORTED_MEDIA_TYPE;
    code = 'UNSUPPORTED_ENCODING';
    message = 'Unsupported charset or content encoding';
  }

  if (status >= 500) console.error('External API error:', err); // stack stays server-side
  res.locals.apiError = { code, message: logMessage ?? message };
  res.status(status).json({
    statusCode: status,
    success: false,
    message,
    code,
    error: details.length ? details : [{ path: '', message }],
  });
};
router.use(errorHandler);

export const externalApiRouter = router;
