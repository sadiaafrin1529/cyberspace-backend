import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../config';

export const CV_DIR = path.resolve(
  config.cv_storage_dir || path.join(process.cwd(), 'private-uploads', 'cvs'),
);

export const CV_MAX_BYTES = 5 * 1024 * 1024;

export const CV_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Detect real type from file signature, ignoring client-supplied MIME. */
export const detectCvExt = (buf: Buffer): '.pdf' | '.doc' | '.docx' | null => {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return '.pdf';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'))) {
    return '.doc';
  }
  if (buf.length >= 4 && buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    // DOCX is a zip containing word/ entries; require the marker to reject arbitrary zips.
    return buf.includes(Buffer.from('word/')) ? '.docx' : null;
  }
  return null;
};

export const saveCv = async (buf: Buffer, ext: string): Promise<string> => {
  await fs.promises.mkdir(CV_DIR, { recursive: true, mode: 0o700 });
  const name = `${crypto.randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(CV_DIR, name), buf, { mode: 0o600, flag: 'wx' });
  return name;
};

/** Resolve a stored file name to an absolute path, refusing anything outside CV_DIR. */
export const resolveCv = (name: string): string | null => {
  const full = path.resolve(CV_DIR, name);
  return full.startsWith(CV_DIR + path.sep) ? full : null;
};

export const deleteCv = async (name: string): Promise<void> => {
  const full = resolveCv(name);
  if (!full) return;
  await fs.promises.unlink(full).catch(() => undefined);
};
