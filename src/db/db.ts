import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (connectionString) {
      // Robust connection handling for Supabase & other Postgres providers
      let poolConfig: any = {
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 15000,
        query_timeout: 30000,
        keepAlive: true,
        ssl: { rejectUnauthorized: false },
      };

      try {
        const urlObj = new URL(connectionString);
        let username = decodeURIComponent(urlObj.username);
        let password = decodeURIComponent(urlObj.password);

        // Extract tenant ID if username is formatted as postgres.[tenant]
        let tenantId = '';
        if (username.startsWith('postgres.') && username.length > 9) {
          tenantId = username.substring(9);
        }

        // For Supabase poolers (aws-0-*.pooler.supabase.com), Supabase pooler requires SNI hostname
        // to correctly route tenant connections when TLS is initiated
        if (urlObj.hostname.includes('pooler.supabase.com') && tenantId) {
          poolConfig.ssl = {
            rejectUnauthorized: false,
            servername: `db.${tenantId}.supabase.co`
          };
        }

        poolConfig.host = urlObj.hostname;
        poolConfig.port = urlObj.port ? parseInt(urlObj.port, 10) : 5432;
        poolConfig.user = username;
        poolConfig.password = password;
        poolConfig.database = urlObj.pathname ? urlObj.pathname.replace(/^\//, '') : 'postgres';
      } catch (e) {
        poolConfig.connectionString = connectionString;
      }

      global._postgresPool = new Pool(poolConfig);
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 15000,
        query_timeout: 30000,
        keepAlive: true,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

export const DEFAULT_BRAND_LOGO_URL = '/assets/aistudio/e2e2df32-f624-464c-bbf2-dd5e68b4722a_268f824d.jpg';

const INITIAL_TRACKER_ITEMS: Array<{ key: string; banglaLabel: string; group: 'amal' | 'dawah'; displayOrder: number }> = [
  { key: 'salah_5_jamaah', banglaLabel: '৫ ওয়াক্ত সালাত জামাতে আদায়', group: 'amal', displayOrder: 1 },
  { key: 'fajr_jamaah', banglaLabel: 'ফজর জামাতে আদায়', group: 'amal', displayOrder: 2 },
  { key: 'quran_tilawat', banglaLabel: 'কুরআন তিলাওয়াত (অর্থসহ/নিয়মিত)', group: 'amal', displayOrder: 3 },
  { key: 'masnoon_dua_dhikr', banglaLabel: 'মাসনুন দুআ ও সকাল-সন্ধ্যার যিকর', group: 'amal', displayOrder: 4 },
  { key: 'tahajjud_or_nafl', banglaLabel: 'তাহাজ্জুদ বা নফল ইবাদত', group: 'amal', displayOrder: 5 },
  { key: 'hadith_or_islamic_book', banglaLabel: 'হাদিস বা দ্বীনি বই অধ্যয়ন', group: 'amal', displayOrder: 6 },
  { key: 'contacted_brother', banglaLabel: 'কমপক্ষে একজন ভাইয়ের সাথে যোগাযোগ / খোঁজখবর', group: 'dawah', displayOrder: 7 },
  { key: 'dawah_invitation', banglaLabel: 'কাউকে দাওয়াহ বা দ্বীনি কথা বলা', group: 'dawah', displayOrder: 8 },
  { key: 'invited_to_masjid_program', banglaLabel: 'মসজিদ বা মুভমেন্ট প্রোগ্রামে আমন্ত্রণ', group: 'dawah', displayOrder: 9 },
  { key: 'attended_study_circle', banglaLabel: 'ইলমি মুহাজারা / পাঠচক্র / বয়ানে উপস্থিতি', group: 'dawah', displayOrder: 10 },
  { key: 'helped_someone', banglaLabel: 'কারও উপকার বা খেদমত করা', group: 'dawah', displayOrder: 11 },
  { key: 'self_accountability', banglaLabel: 'দিনের শেষে নিজের আমল ও আচরণ পর্যালোচনা', group: 'dawah', displayOrder: 12 },
];

let _aiTablesEnsured = false;
export const ensureAiTables = async () => {
  if (_aiTablesEnsured) return;
  const statements = [
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by_account_id uuid`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS assigned_to text`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS reminder_note text`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS completed_at timestamp`,
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS source text DEFAULT 'admin'`,
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS source_voice_entry_id uuid`,
    `ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb`,
    `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS feature_my_dawah_track boolean DEFAULT true`,
    `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS feature_care_radar boolean DEFAULT true`,
    `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS care_no_contact_soon_days integer DEFAULT 7`,
    `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS care_no_contact_urgent_days integer DEFAULT 14`,
    `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS care_stalled_stage_days integer DEFAULT 30`,
    `CREATE TABLE IF NOT EXISTS ai_voice_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      admin_user_id uuid REFERENCES member_accounts(id) ON DELETE SET NULL,
      admin_username text,
      original_transcription text NOT NULL,
      edited_transcription text NOT NULL,
      ai_observations jsonb DEFAULT '[]'::jsonb,
      existing_indicators jsonb DEFAULT '[]'::jsonb,
      suggested_indicators jsonb DEFAULT '[]'::jsonb,
      uncertain_observations jsonb DEFAULT '[]'::jsonb,
      indicator_updates jsonb DEFAULT '{}'::jsonb,
      approved_category_ids jsonb DEFAULT '[]'::jsonb,
      approved_changes jsonb DEFAULT '{}'::jsonb,
      status text NOT NULL DEFAULT 'pending',
      approved_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS member_ai_insights (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id uuid NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
      source_entry_id uuid REFERENCES ai_voice_entries(id) ON DELETE SET NULL,
      gap_analysis jsonb,
      dawah_guidance jsonb,
      updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS member_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      responsible_account_id uuid NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS member_assignments_resp_contact_idx ON member_assignments(responsible_account_id, contact_id)`,
    `CREATE TABLE IF NOT EXISTS tracker_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL UNIQUE,
      bangla_label text NOT NULL,
      "group" text NOT NULL DEFAULT 'amal',
      is_active boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS member_daily_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id uuid NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
      report_date date NOT NULL,
      items jsonb NOT NULL DEFAULT '{}'::jsonb,
      note text,
      status text NOT NULL DEFAULT 'draft',
      was_shared_at_submit boolean NOT NULL DEFAULT false,
      submitted_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS member_daily_reports_acc_date_idx ON member_daily_reports(member_account_id, report_date)`,
    `CREATE TABLE IF NOT EXISTS member_dawah_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id uuid NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      date date NOT NULL,
      target_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
      description text NOT NULL,
      outcome text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS member_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id uuid NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      date date NOT NULL,
      body text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS member_sharing_settings (
      member_account_id uuid PRIMARY KEY REFERENCES member_accounts(id) ON DELETE CASCADE,
      monitoring_enabled boolean NOT NULL DEFAULT false,
      share_daily_amal boolean NOT NULL DEFAULT false,
      share_dawah_activities boolean NOT NULL DEFAULT false,
      share_personal_notes boolean NOT NULL DEFAULT false,
      share_weekly_summary boolean NOT NULL DEFAULT false,
      updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS member_sharing_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id uuid NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      changed_at timestamp NOT NULL DEFAULT now(),
      before jsonb NOT NULL,
      after jsonb NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS care_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      assigned_account_id uuid REFERENCES member_accounts(id) ON DELETE SET NULL,
      urgency text NOT NULL DEFAULT 'ok',
      title text NOT NULL,
      reason text NOT NULL,
      suggested_action text NOT NULL,
      channel text NOT NULL DEFAULT 'call',
      due_at timestamp,
      status text NOT NULL DEFAULT 'open',
      snoozed_until timestamp,
      cycle_no integer NOT NULL DEFAULT 1,
      source_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
      completed_outcome text,
      completed_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS care_snapshots (
      contact_id uuid PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
      gap_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
      urgency text NOT NULL DEFAULT 'ok',
      open_task_count integer NOT NULL DEFAULT 0,
      next_step_summary text,
      ai_refined_at timestamp,
      recomputed_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS member_reminders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id uuid NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      item_key text,
      title text,
      time text NOT NULL,
      days_of_week jsonb NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )`,
    `ALTER TABLE member_daily_reports ADD COLUMN IF NOT EXISTS item_minutes jsonb NOT NULL DEFAULT '{}'::jsonb`,
    `ALTER TABLE member_daily_reports ADD COLUMN IF NOT EXISTS total_productive_minutes integer NOT NULL DEFAULT 0`,
    `ALTER TABLE member_sharing_settings ADD COLUMN IF NOT EXISTS share_productive_time boolean NOT NULL DEFAULT false`,
    `ALTER TABLE member_sharing_settings ADD COLUMN IF NOT EXISTS share_screen_time boolean NOT NULL DEFAULT false`,
    `CREATE TABLE IF NOT EXISTS member_screen_time_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id uuid NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
      record_date date NOT NULL,
      minutes integer NOT NULL DEFAULT 0,
      data_source text NOT NULL DEFAULT 'manual',
      was_shared_at_submit boolean NOT NULL DEFAULT false,
      note text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS member_screen_time_acc_date_idx ON member_screen_time_records(member_account_id, record_date)`,
  ];

  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('[DB Ensure Tables Warning]', (err as any)?.message || err);
    }
  }

  // Idempotent seed for tracker_items ONLY if table is empty
  try {
    const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM tracker_items`);
    if ((countRes.rows[0]?.cnt ?? 0) === 0) {
      for (const item of INITIAL_TRACKER_ITEMS) {
        await pool.query(
          `INSERT INTO tracker_items (key, bangla_label, "group", is_active, display_order)
           VALUES ($1, $2, $3, true, $4)
           ON CONFLICT (key) DO NOTHING`,
          [item.key, item.banglaLabel, item.group, item.displayOrder]
        );
      }
    }
  } catch (err) {
    console.error('[DB Seed Tracker Items Warning]', (err as any)?.message || err);
  }

  // Replace legacy placeholder logo (or set default logo if unset) with the uploaded Kotbari Dawah Movement logo
  try {
    const brandRes = await pool.query(`SELECT id, primary_logo, mobile_logo, favicon FROM branding_settings WHERE id = 1`);
    if (brandRes.rows.length === 0) {
      await pool.query(
        `INSERT INTO branding_settings (id, primary_logo, mobile_logo, favicon)
         VALUES (1, $1, $1, $1) ON CONFLICT (id) DO NOTHING`,
        [DEFAULT_BRAND_LOGO_URL]
      );
    } else {
      const row = brandRes.rows[0];
      const isLegacyPng = typeof row.primary_logo === 'string' && row.primary_logo.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQ');
      if (!row.primary_logo || isLegacyPng) {
        await pool.query(
          `UPDATE branding_settings
           SET primary_logo = $1,
               mobile_logo = CASE WHEN mobile_logo IS NULL OR mobile_logo = '' OR mobile_logo LIKE 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQ%' THEN $1 ELSE mobile_logo END,
               favicon = CASE WHEN favicon IS NULL OR favicon = '' OR favicon LIKE 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQ%' THEN $1 ELSE favicon END,
               updated_at = now()
           WHERE id = 1`,
          [DEFAULT_BRAND_LOGO_URL]
        );
      }
    }
  } catch (err) {
    console.error('[DB Sync Logo Warning]', (err as any)?.message || err);
  }

  _aiTablesEnsured = true;
};

