import { z } from 'zod';
import { API_PERMISSION_IDS } from './apiKey.permissions';
import { parseIpRule } from './apiKey.utils';

const nameField = z.string().trim().min(2, 'Name must be at least 2 characters').max(80);

const permissionsField = z
  .array(z.string())
  .min(1, 'Select at least one permission')
  .max(API_PERMISSION_IDS.length)
  .refine((list) => list.every((p) => API_PERMISSION_IDS.includes(p)), 'Unknown permission')
  .transform((list) => Array.from(new Set(list)));

const ipsField = z
  .array(z.string().trim().min(1))
  .max(20, 'At most 20 IP rules')
  .refine((list) => list.every((r) => parseIpRule(r) !== null), 'Each entry must be an IP address or CIDR range')
  .transform((list) => Array.from(new Set(list.map((r) => r.trim()))));

const expiresField = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v))
  .refine((d) => d.getTime() > Date.now(), 'Expiration must be in the future')
  .nullable();

export const createApiKeySchema = z.object({
  name: nameField,
  permissions: permissionsField,
  allowedIps: ipsField.default([]),
  expiresAt: expiresField.optional(),
});

// Permissions, IPs, name and expiry can be changed later; the secret can never be re-issued.
export const updateApiKeySchema = z
  .object({
    name: nameField,
    permissions: permissionsField,
    allowedIps: ipsField,
    expiresAt: expiresField,
  })
  .partial();

export const logsQuerySchema = z.object({
  apiKeyId: z.coerce.number().int().positive().optional(),
  method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).optional(),
  outcome: z.enum(['success', 'failure']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type LogsQuery = z.infer<typeof logsQuerySchema>;
