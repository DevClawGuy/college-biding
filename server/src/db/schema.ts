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
  parentEmail: text('parent_email'),
  parentAccessToken: text('parent_access_token'),
  lastSeenAt: integer('last_seen_at'),
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
  status: text('status', { enum: ['active', 'ended', 'cancelled', 'pending_landlord_confirmation'] }).notNull().default('active'),
  approvalStatus: text('approval_status').notNull().default('pending'),
  winnerId: text('winner_id'),
  secureLeasePrice: integer('secure_lease_price'),
  viewCount: integer('view_count').notNull().default(0),
  recommendationCache: text('recommendation_cache'),
  recommendationCachedAt: integer('recommendation_cached_at'),
  propertyType: text('property_type').default('apartment'),
  tags: text('tags').notNull().default('[]'), // JSON array
  pricePerBed: integer('price_per_bed'),
  fmrForBeds: integer('fmr_for_beds'),
  rentcheckScore: real('rentcheck_score'),
  rentcheckLabel: text('rentcheck_label'),
  nearbyAmenities: text('nearby_amenities'),
  nearbyAmenitiesUpdatedAt: text('nearby_amenities_updated_at'),
  createdAt: text('created_at').notNull().default(''),
});

export const bids = sqliteTable('bids', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  userId: text('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(),
  isAutoBid: integer('is_auto_bid', { mode: 'boolean' }).notNull().default(false),
  isSecureLease: integer('is_secure_lease', { mode: 'boolean' }).notNull().default(false),
  groupId: text('group_id'),
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

export const bidGroups = sqliteTable('bid_groups', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  leaderId: text('leader_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'dissolved'] }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
});

export const bidGroupMembers = sqliteTable('bid_group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => bidGroups.id),
  userId: text('user_id'),
  email: text('email').notNull(),
  name: text('name'),
  status: text('status', { enum: ['pending', 'accepted', 'declined'] }).notNull().default('pending'),
  invitedAt: integer('invited_at').notNull(),
  joinedAt: integer('joined_at'),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  senderId: text('sender_id').notNull().references(() => users.id),
  recipientId: text('recipient_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

export const listingViews = sqliteTable('listing_views', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  viewerId: text('viewer_id'),
  viewerIp: text('viewer_ip'),
  viewedAt: integer('viewed_at').notNull(),
});

export const viewSnapshots = sqliteTable('view_snapshots', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  viewCount: integer('view_count').notNull(),
  recordedAt: integer('recorded_at').notNull(),
});

export const favorites = sqliteTable('favorites', {
  userId: text('user_id').notNull().references(() => users.id),
  listingId: text('listing_id').notNull().references(() => listings.id),
});

export const universities = sqliteTable('universities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ipedsId: text('ipeds_id').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zip: text('zip'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  enrollment: integer('enrollment'),
  slug: text('slug').notNull().unique(),
  countyFips: text('county_fips'),
  portalActive: integer('portal_active').notNull().default(1),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  ipedsRoomBoardOncampus: integer('ipeds_room_board_oncampus'),
  ipedsHousingOffcampus: integer('ipeds_housing_offcampus'),
  ipedsDataYear: integer('ipeds_data_year'),
  zoriLatest: real('zori_latest'),
  zori12moAgo: real('zori_12mo_ago'),
  zoriYoYPct: real('zori_yoy_pct'),
  zoriUpdatedAt: text('zori_updated_at'),
  createdAt: text('created_at').notNull().default(''),
});

export const universityMarketData = sqliteTable(
  'university_market_data',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    universityId: integer('university_id').notNull(),
    bedroomCount: integer('bedroom_count').notNull(),
    medianRent: integer('median_rent'),
    dataYear: integer('data_year'),
    dataSource: text('data_source'),
    updatedAt: text('updated_at').notNull().default(''),
  }
);

export const expressionsOfInterest = sqliteTable(
  'expressions_of_interest',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull().references(() => listings.id),
    userId: text('user_id').notNull().references(() => users.id),
    moveInDate: text('move_in_date'),
    occupants: integer('occupants'),
    note: text('note'),
    rentSuggestion: integer('rent_suggestion'),
    createdAt: text('created_at').notNull().default(''),
  }
);
