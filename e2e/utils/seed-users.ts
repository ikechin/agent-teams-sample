import { execSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

function execInRepo(command: string) {
  execSync(command, { stdio: 'inherit', cwd: REPO_ROOT });
}

/**
 * Ensure approver user exists. Idempotent via ON CONFLICT DO NOTHING.
 * Password hash is copied from the existing test user so login matches
 * password123.
 */
export function ensureApproverUser() {
  execInRepo(
    `docker compose exec -T bff-db psql -U bff_user -d bff_db -c "INSERT INTO users (email, password_hash, name, role_id) VALUES ('approver@example.com', (SELECT password_hash FROM users WHERE email='test@example.com'), '承認者太郎', 'contract-manager') ON CONFLICT (email) DO NOTHING;"`,
  );
}

/**
 * Ensure viewer user exists. Idempotent.
 */
export function ensureViewerUser() {
  execInRepo(
    `docker compose exec -T bff-db psql -U bff_user -d bff_db -c "INSERT INTO users (email, password_hash, name, role_id) VALUES ('viewer@example.com', (SELECT password_hash FROM users WHERE email='test@example.com'), '閲覧太郎', 'viewer') ON CONFLICT (email) DO NOTHING;"`,
  );
}
