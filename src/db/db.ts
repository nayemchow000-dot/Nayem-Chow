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
