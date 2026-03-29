import { createClient, Client } from '@libsql/client';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

let client: Client | null = null;
let database: LibSQLDatabase<typeof schema> | null = null;

function getClient(): Client {
  if (!client) {
    const url = process.env.DATABASE_URL || 'file:./houserush.db';
    console.log('Creating LibSQL client with URL:', url.startsWith('file:') ? url : url.substring(0, 40) + '...');
    client = createClient({ url });
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
