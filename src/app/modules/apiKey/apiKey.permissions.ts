/**
 * Single source of truth for API-key permissions.
 * The Settings UI renders its checkboxes from this list (via GET /api/api-keys/meta),
 * and the external router guards each route with one of these ids.
 */
export const API_PERMISSIONS = [
  { id: 'categories:read', group: 'Categories', label: 'Read categories', description: 'List the category tree and fetch single categories.' },
  { id: 'categories:create', group: 'Categories', label: 'Create categories', description: 'Create root categories and sub-categories at any depth.' },
  { id: 'categories:update', group: 'Categories', label: 'Update categories', description: 'Rename, re-order, activate/deactivate or move categories.' },
  { id: 'categories:delete', group: 'Categories', label: 'Delete categories', description: 'Delete empty categories that no product uses.' },
  { id: 'products:read', group: 'Products', label: 'Read products', description: 'List, search and fetch products.' },
  { id: 'products:create', group: 'Products', label: 'Create products', description: 'Create products with translations.' },
  { id: 'products:update', group: 'Products', label: 'Update products', description: 'Edit product fields, price, stock and translations.' },
  { id: 'products:delete', group: 'Products', label: 'Delete products', description: 'Permanently delete products.' },
] as const;

export type ApiPermission = (typeof API_PERMISSIONS)[number]['id'];

export const API_PERMISSION_IDS: readonly string[] = API_PERMISSIONS.map((p) => p.id);

export const isApiPermission = (value: string): value is ApiPermission => API_PERMISSION_IDS.includes(value);
