import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../lib/config.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDir, 'migrations');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const db = drizzle(pool);

try {
  console.log(`Running database migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('Database migrations completed successfully.');
} catch (error) {
  console.error('Database migrations failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
