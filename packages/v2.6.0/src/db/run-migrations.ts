import { DrizzleConfig } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDbClient } from './create-db-connection';
import { Client } from 'pg';

export async function runMigrations({
  schema,
  client,
}: {
  schema: DrizzleConfig<Record<string, unknown>>['schema'];
  client: Client;
}) {
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'migrations' });
}
