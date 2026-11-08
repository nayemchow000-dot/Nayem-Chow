const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS branding_settings (
      id integer PRIMARY KEY,
      primary_logo text,
      mobile_logo text,
      favicon text,
      hero_background text,
      corner_image text,
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log('branding_settings created or exists');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS member_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
      username text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'member',
      is_active boolean NOT NULL DEFAULT true,
      is_public boolean NOT NULL DEFAULT false,
      share_slug text UNIQUE,
      custom_bio text,
      privacy_profile_info boolean NOT NULL DEFAULT true,
      privacy_growth_stage boolean NOT NULL DEFAULT true,
      privacy_growth_journey boolean NOT NULL DEFAULT true,
      privacy_salah_tracking boolean NOT NULL DEFAULT true,
      privacy_activities boolean NOT NULL DEFAULT true,
      privacy_phone boolean NOT NULL DEFAULT false,
      privacy_area boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log('member_accounts created or exists');
}

run().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
