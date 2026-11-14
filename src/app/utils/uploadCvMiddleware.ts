import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { CV_MAX_BYTES, CV_TYPES } from './cvStorage';

const multerCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CV_MAX_BYTES, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!CV_TYPES[ext]) {
      return cb(new AppError(httpStatus.BAD_REQUEST, 'CV must be a PDF, DOC or DOCX file'));
    }
    cb(null, true);
  },
}).single('cv');

/** Multer wrapper that turns upload errors into 4xx AppErrors. */
export const uploadCv = (req: Request, res: Response, next: NextFunction) => {
  multerCv(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? `CV must be ${CV_MAX_BYTES / 1024 / 1024} MB or smaller`
          : 'Invalid upload';
      return next(new AppError(httpStatus.BAD_REQUEST, msg));
    }
    next(err);
  });
};
