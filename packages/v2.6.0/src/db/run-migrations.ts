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
  schema,
}: {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  schema: DrizzleConfig<Record<string, unknown>>['schema'];
}) {
  const client = await createDbClient({ database, host, password, user, port });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'migrations' });
  await client.end();
}
