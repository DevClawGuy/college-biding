import { createClient } from '@libsql/client';
import { getClientConfig } from './index';

const TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    university TEXT NOT NULL,
    year TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    budget_min INTEGER,
    budget_max INTEGER,
    avatar TEXT,
    is_edu_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    landlord_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    photos TEXT NOT NULL DEFAULT '[]',
    amenities TEXT NOT NULL DEFAULT '[]',
    beds INTEGER NOT NULL,
    baths INTEGER NOT NULL,
    sqft INTEGER NOT NULL,
    distance_to_campus REAL NOT NULL,
    nearest_university TEXT NOT NULL,
    starting_bid INTEGER NOT NULL,
    reserve_price INTEGER NOT NULL,
    current_bid INTEGER NOT NULL DEFAULT 0,
    bid_count INTEGER NOT NULL DEFAULT 0,
    auction_start TEXT NOT NULL,
    auction_end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    is_auto_bid INTEGER NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auto_bids (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    max_amount INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    listing_id TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL,
    listing_id TEXT NOT NULL
  )`,
];

export async function initializeDatabase(): Promise<void> {
  const config = getClientConfig();
  console.log('Initializing database with URL:', config.url.substring(0, 45) + '...');

  const client = createClient(config);

  for (const sql of TABLE_STATEMENTS) {
    try {
      await client.execute(sql);
    } catch (err) {
      console.error('Failed to execute table creation:', sql.substring(0, 60), err);
    }
  }

  // Migrations: add columns that may not exist on older databases
  const migrations = [
    `ALTER TABLE listings ADD COLUMN winner_id TEXT`,
    `ALTER TABLE listings ADD COLUMN approval_status TEXT DEFAULT 'pending'`,
    `ALTER TABLE users ADD COLUMN phone TEXT`,
    `ALTER TABLE users ADD COLUMN email_verification_token TEXT`,
    `ALTER TABLE users ADD COLUMN verification_token_expires INTEGER`,
    `CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique ON favorites (user_id, listing_id)`,
    `ALTER TABLE listings ADD COLUMN secure_lease_price INTEGER`,
    `ALTER TABLE bids ADD COLUMN is_secure_lease INTEGER NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS bid_groups (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      leader_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bid_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT NOT NULL,
      name TEXT,
      status TEXT DEFAULT 'pending',
      invited_at INTEGER NOT NULL,
      joined_at INTEGER
    )`,
    `ALTER TABLE bids ADD COLUMN group_id TEXT`,
    `ALTER TABLE users ADD COLUMN parent_email TEXT`,
    `ALTER TABLE users ADD COLUMN parent_access_token TEXT`,
  ];
  for (const sql of migrations) {
    try {
      await client.execute(sql);
      console.log('Migration applied:', sql.substring(0, 60));
    } catch {
      // Column already exists — safe to ignore
    }
  }

  console.log('Database tables initialized');
}
