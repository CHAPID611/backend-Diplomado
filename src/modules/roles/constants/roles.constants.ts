export const ROLES = {
  ADMIN: 'admin',
  OPERADOR: 'operador',
  USUARIO: 'usuario'
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },
  ROLES: {
    CREATE: 'roles:create',
    READ: 'roles:read',
    UPDATE: 'roles:update',
    DELETE: 'roles:delete',
  },
} as const; 