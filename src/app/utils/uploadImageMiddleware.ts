import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import config from '../config';

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

const uploadOnce = (filePath: string, safeName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, { public_id: safeName, resource_type: 'image', folder: 'cyberspace', timeout: 60000 },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        if (!result) return reject(new Error('No response from Cloudinary'));
        resolve(result.secure_url);
      }
    );
  });
};

export const sendImageToCloudinary = async (filePath: string, imageName: string, attempts = 3): Promise<string> => {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const baseName = path.parse(imageName).name;
  const safeName = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const secureUrl = await uploadOnce(filePath, safeName);
      fs.unlink(filePath, (err) => { if (err) console.warn('Failed to delete local file:', err); });
      return secureUrl;
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
};

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.parse(file.originalname).name;
    cb(null, base + '-' + unique + ext);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF allowed'));
};

export const uploadImage = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
