import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { ApiKeyService } from './apiKey.service';
import { createApiKeySchema, logsQuerySchema, updateApiKeySchema } from './apiKey.validation';

const parseId = (raw: string) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid API key id');
  return id;
};

const GetMeta = catchAsync(async (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const overview = await ApiKeyService.GetOverview();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'API settings retrieved',
    data: { ...ApiKeyService.GetMeta(origin), overview },
  });
});

const ListKeys = catchAsync(async (_req, res) => {
  const data = await ApiKeyService.ListKeys();
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'API keys retrieved', data });
});

const CreateKey = catchAsync(async (req, res) => {
  const data = await ApiKeyService.CreateKey(createApiKeySchema.parse(req.body), req.user!.id);
  res.setHeader('Cache-Control', 'no-store');
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'API key created. Copy it now: it will not be shown again.',
    data,
  });
});

const RevealKey = catchAsync(async (req, res) => {
  const data = await ApiKeyService.RevealKey(parseId(String(req.params.id)));
  res.setHeader('Cache-Control', 'no-store');
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'API key retrieved', data });
});

const UpdateKey = catchAsync(async (req, res) => {
  const data = await ApiKeyService.UpdateKey(parseId(String(req.params.id)), updateApiKeySchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'API key updated', data });
});

const RevokeKey = catchAsync(async (req, res) => {
  const data = await ApiKeyService.RevokeKey(parseId(String(req.params.id)));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'API key revoked', data });
});

const ListLogs = catchAsync(async (req, res) => {
  const { items, meta } = await ApiKeyService.ListLogs(logsQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'API logs retrieved', data: items, meta });
});

export const ApiKeyController = { GetMeta, ListKeys, CreateKey, RevealKey, UpdateKey, RevokeKey, ListLogs };
