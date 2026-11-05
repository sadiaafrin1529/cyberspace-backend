import multer from 'multer';
import fs from 'fs';
import path from 'path';

const resumesDir = path.join(process.cwd(), 'uploads', 'resumes');
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumesDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '.pdf');
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
  if (isPdfMime && isPdfExt) cb(null, true);
  else cb(new Error('Only PDF resumes are accepted'));
};

export const uploadResume = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
