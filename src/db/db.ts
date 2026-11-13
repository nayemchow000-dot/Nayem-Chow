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
        connectionTimeoutMillis: 15000,
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
        connectionTimeoutMillis: 15000,
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

let _aiTablesEnsured = false;
export const ensureAiTables = async () => {
  if (_aiTablesEnsured) return;
  const statements = [
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS assigned_to text`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS reminder_note text`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS completed_at timestamp`,
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
  ];

  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('[DB Ensure AI Tables Warning]', (err as any)?.message || err);
    }
  }
  _aiTablesEnsured = true;
};

