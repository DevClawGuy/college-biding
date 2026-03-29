import { createClient, Client } from '@libsql/client';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

let client: Client | null = null;
let database: LibSQLDatabase<typeof schema> | null = null;

export function getClientConfig() {
  if (process.env.TURSO_DATABASE_URL) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  return { url: process.env.DATABASE_URL || 'file:./houserush.db' };
}

function getClient(): Client {
  if (!client) {
    const config = getClientConfig();
    console.log('Creating LibSQL client with URL:', config.url.substring(0, 45) + '...');
    client = createClient(config);
  }
  return client;
}

function getDb(): LibSQLDatabase<typeof schema> {
  if (!database) {
    database = drizzle(getClient(), { schema });
  }
  return database;
}

// Use a proxy so `db.select()...` works but client is created lazily on first use
export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export { schema };
