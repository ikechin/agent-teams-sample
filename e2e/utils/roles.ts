import path from 'path';

export type RoleName = 'contract-manager' | 'approver' | 'viewer';

export interface RoleCredentials {
  name: RoleName;
  email: string;
  password: string;
  storageStatePath: string;
}

const AUTH_DIR = path.resolve(__dirname, '../.auth');

export const ROLES: Record<RoleName, RoleCredentials> = {
  'contract-manager': {
    name: 'contract-manager',
    email: process.env.TEST_USER_EMAIL ?? 'test@example.com',
    password: process.env.TEST_USER_PASSWORD ?? 'password123',
    storageStatePath: path.join(AUTH_DIR, 'contract-manager.json'),
  },
  approver: {
    name: 'approver',
    email: 'approver@example.com',
    password: 'password123',
    storageStatePath: path.join(AUTH_DIR, 'approver.json'),
  },
  viewer: {
    name: 'viewer',
    email: 'viewer@example.com',
    password: 'password123',
    storageStatePath: path.join(AUTH_DIR, 'viewer.json'),
  },
};
