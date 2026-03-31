import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, desc, gte, ne } from 'drizzle-orm';

// TODO v2: Replace weighted percentiles with gradient boosted tree (XGBoost via WASM) once 50+ closed listings
// TODO v2: Add seasonal adjustment — Sept/Jan = high demand near NJ universities
// TODO v2: Personalize by user bid history — returning bidders who won before get adjusted probs
// TODO v2: Pull NJ median rent data from public HUD/Census API as external anchor
// TODO v3: A/B test recommendation display to measure if it increases bid conversion rate

export interface BidRecommendation {
  recommendedMin: number;
  recommendedMid: number;
  recommendedMax: number;
  winProbAtMin: number;
  winProbAtMid: number;
  winProbAtMax: number;
  winProbAtSecureLease: number | null;
  competitionScore: number;
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
  confidence: 'high' | 'medium' | 'low';
  confidenceNote: string;
  compsUsed: number;
  urgency: 'low' | 'medium' | 'high' | 'extreme';
  insight: string;
  signals: {
    activeBidders: number;
    bidVelocity24h: number;
    viewCount: number;
    viewVelocity: number;
    hoursLeft: number;
    priceIncreasePercent: number;
    recentMomentumPercent: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    weightedMedian: number | null;
  };
  cached: boolean;
  generatedAt: number;
  disclaimer: string;
}

interface ScoredComp {
  currentBid: number;
  similarity: number;
}

interface SignalsInput {
  bidVelocity24h: number;
  pctFromStart: number;
  recentMomentumPct: number;
  medianDeviation: number;
  hoursLeft: number;
  activeBidders: number;
  viewCount: number;
  viewVelocity: number;
}

interface WinProbInput {
  p25: number | null;
  p50: number | null;
  p75: number | null;
  hasSimilarData: boolean;
  competitionScore: number;
  activeBidders: number;
  bidVelocity24h: number;
  currentBid: number;
  secureLeasePrice: number | null;
}

function safeParseJsonArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

export function calcSimilarity(
  listing: { city: string; beds: number; baths: number; propertyType: string | null; startingBid: number; amenities: string },
  comp: { city: string; beds: number; baths: number; propertyType: string | null; startingBid: number; amenities: string },
): number {
  let score = 0;
  if (listing.city === comp.city) score += 30;
  if (listing.beds === comp.beds) score += 25;
  if (listing.baths === comp.baths) score += 15;
  if (listing.propertyType && comp.propertyType && listing.propertyType === comp.propertyType) score += 10;
  if (comp.startingBid > 0 && Math.abs(listing.startingBid - comp.startingBid) / comp.startingBid <= 0.15) score += 10;

  const listAmenities = safeParseJsonArray(listing.amenities);
  const compAmenities = safeParseJsonArray(comp.amenities);
  if (listAmenities.length > 0 && compAmenities.length > 0) {
    const intersection = listAmenities.filter(a => compAmenities.includes(a)).length;
    const union = new Set([...listAmenities, ...compAmenities]).size;
    if (union > 0 && intersection / union >= 0.5) score += 10;
  }

  return score;
}

export function calcWeightedPercentiles(
  values: number[],
  weights: number[],
): { p25: number | null; p50: number | null; p75: number | null; weightedMedian: number | null } {
  if (values.length === 0) return { p25: null, p50: null, p75: null, weightedMedian: null };

  const pairs = values.map((v, i) => ({ value: v, weight: weights[i] })).sort((a, b) => a.value - b.value);
  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return { p25: null, p50: null, p75: null, weightedMedian: null };

  function percentileAt(target: number): number {
    let cumulative = 0;
    for (const p of pairs) {
      cumulative += p.weight;
      if (cumulative / totalWeight >= target) return p.value;
    }
    return pairs[pairs.length - 1].value;
  }

  const p25 = percentileAt(0.25);
  const p50 = percentileAt(0.50);
  const p75 = percentileAt(0.75);
  return { p25, p50, p75, weightedMedian: p50 };
}

export function calcCompetitionScore(s: SignalsInput): { competitionScore: number; competitionLevel: 'low' | 'medium' | 'high' | 'very_high' } {
  const velocityScore = Math.min(s.bidVelocity24h / 15, 1) * 100;

  const medDev = s.medianDeviation;
  const priceTrajectoryScore = Math.min(
    (s.pctFromStart * 0.4 + s.recentMomentumPct * 0.4 + Math.max(medDev, 0) * 0.2) / 15,
    1,
  ) * 100;

  let urgencyScore: number;
  if (s.hoursLeft >= 48) urgencyScore = 0;
  else if (s.hoursLeft >= 24) urgencyScore = 25;
  else if (s.hoursLeft >= 6) urgencyScore = 60;
  else if (s.hoursLeft >= 1) urgencyScore = 85;
  else urgencyScore = 100;

  const bidderScore = Math.min(s.activeBidders / 8, 1) * 100;

  const viewMomentumScore = s.viewVelocity > 0
    ? Math.min(s.viewVelocity / 20, 1) * 100
    : Math.min(s.viewCount / 150, 1) * 50;

  const competitionScore = Math.round(
    velocityScore * 0.30 +
    priceTrajectoryScore * 0.20 +
    urgencyScore * 0.20 +
    bidderScore * 0.20 +
    viewMomentumScore * 0.10,
  );

  let competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
  if (competitionScore <= 25) competitionLevel = 'low';
  else if (competitionScore <= 50) competitionLevel = 'medium';
  else if (competitionScore <= 75) competitionLevel = 'high';
  else competitionLevel = 'very_high';

  return { competitionScore, competitionLevel };
}

export function winProbAt(bidAmount: number, input: WinProbInput): number {
  const { p25, p50, p75, hasSimilarData, competitionScore, activeBidders, bidVelocity24h, currentBid, secureLeasePrice } = input;

  let rawProb: number;

  if (hasSimilarData && p25 != null && p50 != null && p75 != null) {
    if (bidAmount >= (secureLeasePrice ?? Infinity)) {
      rawProb = 95;
    } else if (bidAmount >= p75) {
      rawProb = Math.min(90, 75 + (competitionScore < 50 ? 10 : 5));
    } else if (bidAmount >= p50) {
      const range = p75 - p50;
      rawProb = range > 0 ? Math.round(55 + ((bidAmount - p50) / range) * 20) : 65;
    } else if (bidAmount >= p25) {
      const range = p50 - p25;
      rawProb = range > 0 ? Math.round(30 + ((bidAmount - p25) / range) * 25) : 42;
    } else {
      rawProb = Math.max(5, 15 - Math.floor(competitionScore / 10));
    }
  } else {
    const distanceAboveCurrent = bidAmount - currentBid;
    const baseProb = Math.max(10, 70 - competitionScore * 0.5);
    const incrementBonus = Math.min(30, Math.floor(Math.max(0, distanceAboveCurrent) / 25) * 8);
    rawProb = Math.min(90, Math.round(baseProb + incrementBonus));
  }

  const pressurePenalty = Math.min(15, activeBidders * 1.5 + bidVelocity24h * 0.5);
  return Math.max(5, Math.round(rawProb - pressurePenalty));
}

export async function generateBidRecommendation(listingId: string): Promise<BidRecommendation> {
  const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
  if (!listing) throw new Error(`Listing ${listingId} not found`);

  // Fetch bids
  const allBids = await db.select()
    .from(schema.bids)
    .where(eq(schema.bids.listingId, listingId))
    .orderBy(desc(schema.bids.timestamp))
    .limit(50);

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const oneDayAgo = now - 86400000;

  // Active bidders (distinct users in last 7 days)
  const recentBidderIds = new Set(
    allBids.filter(b => new Date(b.timestamp).getTime() > sevenDaysAgo).map(b => b.userId),
  );
  const activeBidders = recentBidderIds.size;

  // Bids in last 24h
  const bids24h = allBids.filter(b => new Date(b.timestamp).getTime() > oneDayAgo);
  const bidVelocity24h = bids24h.length;

  // Bid amount from ~24h ago (for momentum calc)
  const olderBids = allBids.filter(b => new Date(b.timestamp).getTime() <= oneDayAgo);
  const bid24hAgoAmount = olderBids.length > 0 ? olderBids[0].amount : listing.startingBid;

  // View snapshots
  const snapshots = await db.select()
    .from(schema.viewSnapshots)
    .where(eq(schema.viewSnapshots.listingId, listingId))
    .orderBy(desc(schema.viewSnapshots.recordedAt))
    .limit(2);

  // Insert new snapshot if needed (last one > 1 hour ago or none)
  if (snapshots.length === 0 || (now - snapshots[0].recordedAt) > 3600000) {
    await db.insert(schema.viewSnapshots).values({
      id: crypto.randomUUID(),
      listingId,
      viewCount: listing.viewCount,
      recordedAt: now,
    }).run();
  }

  // Comp listings (closed with winner)
  const closedListings = await db.select()
    .from(schema.listings)
    .where(and(
      eq(schema.listings.status, 'ended'),
      ne(schema.listings.id, listingId),
    ));
  const closedWithWinner = closedListings.filter(l => l.winnerId);

  // Score comps
  const scoredComps: ScoredComp[] = [];
  for (const comp of closedWithWinner) {
    const similarity = calcSimilarity(
      { city: listing.city, beds: listing.beds, baths: listing.baths, propertyType: listing.propertyType, startingBid: listing.startingBid, amenities: listing.amenities },
      { city: comp.city, beds: comp.beds, baths: comp.baths, propertyType: comp.propertyType, startingBid: comp.startingBid, amenities: comp.amenities },
    );
    if (similarity >= 50) {
      scoredComps.push({ currentBid: comp.currentBid, similarity });
    }
  }
  scoredComps.sort((a, b) => b.similarity - a.similarity);
  const topComps = scoredComps.slice(0, 15);

  // Signals
  const auctionEndMs = new Date(listing.auctionEnd).getTime();
  const hoursLeft = Math.max(0, (auctionEndMs - now) / 3600000);

  const pctFromStart = listing.startingBid > 0
    ? ((listing.currentBid - listing.startingBid) / listing.startingBid) * 100
    : 0;

  const recentMomentumPct = bid24hAgoAmount > 0
    ? ((listing.currentBid - bid24hAgoAmount) / bid24hAgoAmount) * 100
    : 0;

  let viewVelocity = 0;
  if (snapshots.length >= 2) {
    const timeDiffHours = (snapshots[0].recordedAt - snapshots[1].recordedAt) / 3600000;
    if (timeDiffHours > 0) {
      viewVelocity = (snapshots[0].viewCount - snapshots[1].viewCount) / timeDiffHours;
    }
  }

  const winningBids = topComps.map(c => c.currentBid);
  const weights = topComps.map(c => c.similarity);
  const { p25, p50, p75, weightedMedian } = calcWeightedPercentiles(winningBids, weights);
  const hasSimilarData = topComps.length >= 3;

  const medianDeviation = weightedMedian ? ((listing.currentBid - weightedMedian) / weightedMedian) * 100 : 0;

  // Competition
  const { competitionScore, competitionLevel } = calcCompetitionScore({
    bidVelocity24h,
    pctFromStart,
    recentMomentumPct,
    medianDeviation,
    hoursLeft,
    activeBidders,
    viewCount: listing.viewCount,
    viewVelocity,
  });

  // Recommendation range
  let recommendedMin = listing.currentBid + 25;
  let recommendedMid: number;
  let recommendedMax: number;

  if (hasSimilarData) {
    const marketPressure = (competitionScore / 100) * ((p75 ?? 0) - (weightedMedian ?? 0));
    recommendedMid = Math.round((weightedMedian ?? listing.currentBid) + marketPressure);
  } else {
    recommendedMid = Math.round(listing.currentBid + 25 + (competitionScore / 100) * 125);
  }

  const statisticalCeiling = p75 ?? (recommendedMid + 100);
  const affordabilityCap = Math.round(listing.startingBid * 1.5);
  const secureLeaseCap = listing.secureLeasePrice ? listing.secureLeasePrice - 25 : Infinity;
  recommendedMax = Math.min(statisticalCeiling, affordabilityCap, secureLeaseCap);
  recommendedMax = Math.max(recommendedMax, recommendedMid + 25);
  recommendedMin = Math.min(recommendedMin, recommendedMid);

  // Win probs
  const probInput: WinProbInput = {
    p25, p50, p75, hasSimilarData, competitionScore, activeBidders, bidVelocity24h,
    currentBid: listing.currentBid, secureLeasePrice: listing.secureLeasePrice,
  };
  const winProbAtMin = winProbAt(recommendedMin, probInput);
  const winProbAtMid = winProbAt(recommendedMid, probInput);
  const winProbAtMax = winProbAt(recommendedMax, probInput);
  const winProbAtSecureLease = listing.secureLeasePrice
    ? winProbAt(listing.secureLeasePrice, probInput)
    : null;

  // Confidence
  const compsUsed = topComps.length;
  let confidence: 'high' | 'medium' | 'low';
  let confidenceNote: string;
  if (compsUsed >= 10) {
    confidence = 'high';
    confidenceNote = `Based on ${compsUsed} similar closed listings`;
  } else if (compsUsed >= 3) {
    confidence = 'medium';
    confidenceNote = `Based on limited data (${compsUsed} comps) — live signals weighted more heavily`;
  } else {
    confidence = 'low';
    confidenceNote = 'No similar closed listings yet — based on live auction dynamics only';
  }

  // Urgency
  let urgency: 'low' | 'medium' | 'high' | 'extreme';
  if (hoursLeft < 1) urgency = 'extreme';
  else if (hoursLeft < 6) urgency = 'high';
  else if (hoursLeft < 48 || competitionScore > 50) urgency = 'medium';
  else urgency = 'low';

  // Insight
  let insight: string;
  if (activeBidders >= 5 && bidVelocity24h >= 5) {
    insight = `${activeBidders} students actively bidding — competition is high`;
  } else if (hoursLeft < 6) {
    insight = `Auction ends in ${Math.round(hoursLeft * 60)} minutes — act now`;
  } else if (hasSimilarData && weightedMedian && weightedMedian > listing.currentBid * 1.1) {
    insight = `Similar listings closed at $${Math.round(weightedMedian)}/mo on average`;
  } else if (viewVelocity > 10) {
    insight = `Views growing fast — ${listing.viewCount} students have seen this`;
  } else if (competitionScore < 25) {
    insight = 'Low competition — good chance to win near minimum bid';
  } else if (listing.secureLeasePrice) {
    insight = `Lock it in now — Secure Lease available at $${listing.secureLeasePrice}/mo`;
  } else {
    insight = `Based on ${allBids.length} bids and ${activeBidders} active bidders`;
  }

  const result: BidRecommendation = {
    recommendedMin,
    recommendedMid,
    recommendedMax,
    winProbAtMin,
    winProbAtMid,
    winProbAtMax,
    winProbAtSecureLease,
    competitionScore,
    competitionLevel,
    confidence,
    confidenceNote,
    compsUsed,
    urgency,
    insight,
    signals: {
      activeBidders,
      bidVelocity24h,
      viewCount: listing.viewCount,
      viewVelocity: Math.round(viewVelocity * 10) / 10,
      hoursLeft: Math.round(hoursLeft * 10) / 10,
      priceIncreasePercent: Math.round(pctFromStart * 10) / 10,
      recentMomentumPercent: Math.round(recentMomentumPct * 10) / 10,
      p25,
      p50,
      p75,
      weightedMedian,
    },
    cached: false,
    generatedAt: now,
    disclaimer: 'AI recommendations are estimates based on available data. Actual outcomes may vary. Not financial advice.',
  };

  // Cache
  await db.update(schema.listings).set({
    recommendationCache: JSON.stringify(result),
    recommendationCachedAt: now,
  }).where(eq(schema.listings.id, listingId)).run();

  return result;
}
