import crypto from 'crypto';
import net from 'net';
import config from '../../config';

/** Key format: cs_<live|test>_<43 url-safe chars> (256 bits from the OS CSPRNG). */
export const KEY_SCHEME = 'cs';
export const PREFIX_DISPLAY_LENGTH = 6; // secret chars shown after "cs_live_"

export const apiKeyEnvironment = (): 'live' | 'test' => (config.node_env === 'production' ? 'live' : 'test');

/** Shape check used before touching the database. */
export const API_KEY_PATTERN = /^cs_(live|test)_[A-Za-z0-9_-]{43}$/;

/**
 * SHA-256 is the right primitive here: the secret is 256 bits of randomness, so there is nothing
 * to brute-force and a slow KDF (bcrypt) would only add latency to every request.
 * An optional server-side pepper (API_KEY_PEPPER) makes a leaked database useless on its own.
 */
export const hashApiKey = (plain: string): string =>
  crypto
    .createHash('sha256')
    .update(`${config.api_key_pepper ?? ''}${plain}`)
    .digest('hex');

export const generateApiKey = () => {
  const env = apiKeyEnvironment();
  const secret = crypto.randomBytes(32).toString('base64url'); // 43 chars
  const plain = `${KEY_SCHEME}_${env}_${secret}`;
  return {
    plain,
    prefix: `${KEY_SCHEME}_${env}_${secret.slice(0, PREFIX_DISPLAY_LENGTH)}`,
    hash: hashApiKey(plain),
  };
};

/**
 * Reversible copy of the key (AES-256-GCM) so an admin can copy it again from Settings.
 * Encryption key: API_KEY_ENCRYPTION_SECRET, else API_KEY_PEPPER, else the JWT secret.
 * Changing that secret makes previously stored copies unreadable (the keys themselves keep working).
 */
const encryptionKey = (): Buffer =>
  crypto
    .createHash('sha256')
    .update(config.api_key_encryption_secret ?? config.api_key_pepper ?? config.jwt_access_token_secret ?? '')
    .digest();

export const encryptSecret = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
};

export const decryptSecret = (stored: string): string | null => {
  try {
    const [iv, tag, enc] = stored.split('.').map((p) => Buffer.from(p, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};

export const safeEqualHex =(a: string, b: string): boolean => {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

/** "::ffff:1.2.3.4" -> "1.2.3.4". Returns null for anything that is not an IP. */
export const normalizeIp = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const ip = raw.trim().replace(/^::ffff:/i, '');
  return net.isIP(ip) ? ip : null;
};

/** Validates an allow-list entry: a single IPv4/IPv6 address or a CIDR range. */
export const parseIpRule = (rule: string): { ip: string; prefix?: number; family: 'ipv4' | 'ipv6' } | null => {
  const [addr, bits, ...rest] = rule.trim().split('/');
  if (rest.length) return null;
  const ip = normalizeIp(addr);
  if (!ip) return null;
  const family = net.isIPv4(ip) ? 'ipv4' : 'ipv6';
  if (bits === undefined) return { ip, family };
  if (!/^\d{1,3}$/.test(bits)) return null;
  const prefix = Number(bits);
  if (prefix > (family === 'ipv4' ? 32 : 128)) return null;
  return { ip, prefix, family };
};

export const isIpAllowed = (clientIp: string | null, rules: string[]): boolean => {
  if (rules.length === 0) return true;
  if (!clientIp) return false;
  const list = new net.BlockList();
  for (const rule of rules) {
    const parsed = parseIpRule(rule);
    if (!parsed) continue;
    if (parsed.prefix === undefined) list.addAddress(parsed.ip, parsed.family);
    else list.addSubnet(parsed.ip, parsed.prefix, parsed.family);
  }
  return list.check(clientIp, net.isIPv4(clientIp) ? 'ipv4' : 'ipv6');
};

export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export const apiKeyStatus = (k: { revokedAt: Date | null; expiresAt: Date | null }, now = new Date()): ApiKeyStatus =>
  k.revokedAt ? 'REVOKED' : k.expiresAt && k.expiresAt <= now ? 'EXPIRED' : 'ACTIVE';
