import { Client, Pool } from 'pg';

/**
 * creates a postgres database pool connection
 */
export function createDbPool({
  host,
  port,
  user,
  password,
  database,
}: {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}) {
  const pool = new Pool({
    host: host,
    port: port,
    user: user,
    password: password,
    database: database,
    ssl: false,
  });

  // the pool will emit an error on behalf of any idle clients
  // it contains if a backend error or network partition happens
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  return pool;
}

/**
 * creates a postgres database client connection
 */
export async function createDbClient({
  host,
  port,
  user,
  password,
  database,
}: {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}) {
  const client = new Client({
    host: host,
    port: port,
    user: user,
    password: password,
    database: database,
    ssl: false,
  });

  await client.connect();
  return client;
}
