import { createPool } from '../db/db';
import { hashPassword } from './auth';

export async function syncMemberAccounts() {
  const pool = createPool();
  if (!pool) return;

  // 1. Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS member_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      is_active BOOLEAN NOT NULL DEFAULT true,
      
      is_public BOOLEAN NOT NULL DEFAULT false,
      share_slug TEXT UNIQUE,
      custom_bio TEXT,
      privacy_profile_info BOOLEAN NOT NULL DEFAULT true,
      privacy_growth_stage BOOLEAN NOT NULL DEFAULT true,
      privacy_growth_journey BOOLEAN NOT NULL DEFAULT true,
      privacy_salah_tracking BOOLEAN NOT NULL DEFAULT true,
      privacy_activities BOOLEAN NOT NULL DEFAULT true,
      privacy_phone BOOLEAN NOT NULL DEFAULT false,
      privacy_area BOOLEAN NOT NULL DEFAULT true,
      
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
    );
  `);

  // 2. Check/insert admin user
  const adminRes = await pool.query("SELECT id FROM member_accounts WHERE username = 'admin'");
  if (adminRes.rows.length === 0) {
    const adminHash = hashPassword('admin123');
    await pool.query(
      `INSERT INTO member_accounts (username, password_hash, role, is_public, share_slug, custom_bio)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin', adminHash, 'admin', false, 'admin', 'Kotbari Dawah Movement Administrator']
    );
    console.log('[Auth] Admin account ready: username: admin / password: admin123');
  }

  console.log('[Auth] Member accounts table and admin account verified (admin contacts remain private).');
}
