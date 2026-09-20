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

  // 3. Sync member accounts for existing contacts
  const contactsRes = await pool.query("SELECT id, name, phone, area FROM contacts");
  const existingAccounts = await pool.query("SELECT contact_id, username FROM member_accounts");
  const existingContactIds = new Set(existingAccounts.rows.map((r: any) => r.contact_id).filter(Boolean));
  const existingUsernames = new Set(existingAccounts.rows.map((r: any) => r.username));

  let synced = 0;
  for (const c of contactsRes.rows) {
    if (!existingContactIds.has(c.id)) {
      const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
      let baseUsername = cleanPhone.length >= 6 ? cleanPhone : `brother_${c.id.substring(0, 6)}`;
      let username = baseUsername;
      let counter = 1;
      while (existingUsernames.has(username)) {
        username = `${baseUsername}_${counter}`;
        counter++;
      }
      existingUsernames.add(username);

      const slug = `brother-${c.id.substring(0, 8)}`;
      const isNaeem = (c.phone && c.phone.includes('01869090345')) || (c.name && c.name.includes('নাঈম'));
      const role = isNaeem ? 'admin' : 'member';
      const defaultHash = hashPassword('123456');

      await pool.query(
        `INSERT INTO member_accounts 
         (contact_id, username, password_hash, role, is_public, share_slug, custom_bio)
         VALUES ($1, $2, $3, $4, false, $5, $6)`,
        [c.id, username, defaultHash, role, slug, `Kotbari Dawah Movement member: ${c.name}`]
      );
      synced++;
    }
  }

  console.log(`[Auth] Synced ${synced} member accounts.`);
}

