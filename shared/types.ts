// Shared types between client and server

export type UserRole = 'student' | 'landlord';
export type ListingStatus = 'active' | 'ended' | 'cancelled';
export type NotificationType = 'outbid' | 'won' | 'lost' | 'new_bid' | 'auction_ending';
export type BidStatus = 'active' | 'won' | 'lost';

export interface User {
  id: string;
  email: string;
  name: string;
  university: string;
  year?: string;
  role: UserRole;
  budgetMin?: number;
  budgetMax?: number;
  avatar?: string;
  isEduVerified: boolean;
  createdAt: string;
}

export interface Listing {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  photos: string[];
  amenities: string[];
  beds: number;
  baths: number;
  sqft: number;
  distanceToCampus: number;
  nearestUniversity: string;
  startingBid: number;
  reservePrice: number;
  currentBid: number;
  bidCount: number;
  auctionStart: string;
  auctionEnd: string;
  status: ListingStatus;
  tags: string[];
  createdAt: string;
}

export interface Bid {
  id: string;
  listingId: string;
  userId: string;
  amount: number;
  isAutoBid: boolean;
  timestamp: string;
  userName?: string;
  userUniversity?: string;
}

export interface AutoBid {
  id: string;
  listingId: string;
  userId: string;
  maxAmount: number;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  listingId?: string;
  read: boolean;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  listingId: string;
}

// API request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  university: string;
  year?: string;
  role: UserRole;
  budgetMin?: number;
  budgetMax?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PlaceBidRequest {
  amount: number;
}

export interface SetAutoBidRequest {
  maxAmount: number;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  amenities: string[];
  beds: number;
  baths: number;
  sqft: number;
  distanceToCampus: number;
  nearestUniversity: string;
  startingBid: number;
  reservePrice: number;
  auctionEnd: string;
  tags: string[];
}

export interface ListingsFilter {
  city?: string;
  university?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  maxDistance?: number;
  search?: string;
  sort?: 'ending_soonest' | 'lowest_bid' | 'newest';
  status?: ListingStatus;
}

// Socket.io events
export interface ServerToClientEvents {
  bid_update: (data: { listingId: string; bid: Bid; currentBid: number; bidCount: number }) => void;
  auction_ended: (data: { listingId: string; winnerId?: string; winningBid?: number }) => void;
  notification: (data: Notification) => void;
}

export interface ClientToServerEvents {
  join_listing: (listingId: string) => void;
  leave_listing: (listingId: string) => void;
  join_user: (userId: string) => void;
}
