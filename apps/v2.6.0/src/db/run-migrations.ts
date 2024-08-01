import { drizzle } from 'drizzle-orm/node-postgres';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDbClient } from './create-db-connection';
import { DrizzleConfig } from 'drizzle-orm';

export async function runMigrations({
  database,
  host,
  password,
  user,
  port,
  drizzleConfig,
}: {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  drizzleConfig: DrizzleConfig;
}) {
  const client = await createDbClient({ database, host, password, user, port });
  const db = drizzle(client, drizzleConfig);
  await migrate(db, { migrationsFolder: 'migrations' });
  await client.end();
}
