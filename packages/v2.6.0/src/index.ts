import { drizzle } from 'drizzle-orm/node-postgres';
import { createDbClient } from './db';
import { env } from './env';
import * as schema from './db/schema';
import { up } from './migrate';

async function main() {
  const envVars = env.parse(process.env);

  const client = await createDbClient({
    host: envVars.DATABASE_HOST,
    port: envVars.DATABASE_PORT,
    database: envVars.DATABASE_NAME,
    user: envVars.DATABASE_USER,
    password: envVars.DATABASE_PASSWORD,
  });

  const db = drizzle(client, { schema });

  await up(db);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('error running migration', e);
    process.exit(1);
  });
