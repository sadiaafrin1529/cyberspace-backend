import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,

  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  gemini_api_key:process.env.GEMINI_API_KEY,
  jwt_access_token_secret: process.env.JWT_ACCESS_TOKEN_SECRET,
  jwt_access_token_expires_in: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
  deepseek:{
    deepSeekApiKey:process.env.DEEPSEEK_API_KEY,
    deepSeekApiUrl:process.env.API_URL
  },

  jwt_refresh_token_secret: process.env.JWT_REFRESH_TOKEN_SECRET,
  jwt_refresh_token_expires_in: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
  stripe_secret_key :process.env.STRIPE_SECRET_KEY,
  stripe_publish_key:process.env.PUBLISH_KEY,
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
  hr_email: process.env.HR_EMAIL,
  // Developer API (see modules/apiKey). All optional.
  api_key_pepper: process.env.API_KEY_PEPPER,
  api_key_encryption_secret: process.env.API_KEY_ENCRYPTION_SECRET,
  api_public_url: process.env.API_PUBLIC_URL,
  api_rate_limit_per_minute: Number(process.env.API_RATE_LIMIT_PER_MINUTE) || 120,
  api_log_retention_days: Number(process.env.API_LOG_RETENTION_DAYS) || 90,
  trust_proxy: process.env.TRUST_PROXY,
  // Private CV storage. Never served statically; downloads go through authenticated endpoints.
  cv_storage_dir: process.env.CV_STORAGE_DIR,
  cloudinary: {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  },
};
