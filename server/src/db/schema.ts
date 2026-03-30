import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  university: text('university').notNull(),
  year: text('year'),
  role: text('role', { enum: ['student', 'landlord'] }).notNull().default('student'),
  budgetMin: integer('budget_min'),
  budgetMax: integer('budget_max'),
  avatar: text('avatar'),
  phone: text('phone'),
  isEduVerified: integer('is_edu_verified', { mode: 'boolean' }).notNull().default(false),
  emailVerificationToken: text('email_verification_token'),
  verificationTokenExpires: integer('verification_token_expires'),
  createdAt: text('created_at').notNull().default(''),
});

export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(),
  landlordId: text('landlord_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  photos: text('photos').notNull().default('[]'), // JSON array
  amenities: text('amenities').notNull().default('[]'), // JSON array
  beds: integer('beds').notNull(),
  baths: integer('baths').notNull(),
  sqft: integer('sqft').notNull(),
  distanceToCampus: real('distance_to_campus').notNull(),
  nearestUniversity: text('nearest_university').notNull(),
  startingBid: integer('starting_bid').notNull(),
  reservePrice: integer('reserve_price').notNull(),
  currentBid: integer('current_bid').notNull().default(0),
  bidCount: integer('bid_count').notNull().default(0),
  auctionStart: text('auction_start').notNull(),
  auctionEnd: text('auction_end').notNull(),
  status: text('status', { enum: ['active', 'ended', 'cancelled'] }).notNull().default('active'),
  approvalStatus: text('approval_status').notNull().default('pending'),
  winnerId: text('winner_id'),
  secureLeasePrice: integer('secure_lease_price'),
  tags: text('tags').notNull().default('[]'), // JSON array
  createdAt: text('created_at').notNull().default(''),
});

export const bids = sqliteTable('bids', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  userId: text('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(),
  isAutoBid: integer('is_auto_bid', { mode: 'boolean' }).notNull().default(false),
  isSecureLease: integer('is_secure_lease', { mode: 'boolean' }).notNull().default(false),
  timestamp: text('timestamp').notNull(),
});

export const autoBids = sqliteTable('auto_bids', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  userId: text('user_id').notNull().references(() => users.id),
  maxAmount: integer('max_amount').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['outbid', 'won', 'lost', 'new_bid', 'auction_ending'] }).notNull(),
  message: text('message').notNull(),
  listingId: text('listing_id'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(''),
});

export const favorites = sqliteTable('favorites', {
  userId: text('user_id').notNull().references(() => users.id),
  listingId: text('listing_id').notNull().references(() => listings.id),
});
