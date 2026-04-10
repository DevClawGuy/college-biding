interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface NearbyAmenity {
  category: string;
  name: string;
  distanceMeters: number;
  osmId: number;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function capitalizeTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function categorize(tags: Record<string, string>): string | null {
  if (tags.shop === 'supermarket' || tags.shop === 'grocery' || tags.amenity === 'grocery' || tags.shop === 'convenience') return 'grocery';
  if (tags.shop === 'laundry' || tags.amenity === 'laundry' || tags.amenity === 'washing_machine') return 'laundry';
  if (tags.highway === 'bus_stop' || tags.public_transport === 'stop_position' || tags.public_transport === 'platform') return 'transit';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'cafe' || tags.shop === 'coffee') return 'cafe';
  if (tags.amenity === 'bicycle_parking' || tags.amenity === 'bicycle_rental') return 'bike';
  if (tags.amenity === 'atm') return 'atm';
  return null;
}

async function queryOverpass(query: string): Promise<OverpassElement[] | null> {
  const body = `data=${encodeURIComponent(query)}`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429 || res.status === 504) continue;
      if (!res.ok) continue;
      const json = await res.json() as { elements: OverpassElement[] };
      return json.elements ?? [];
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchNearbyAmenities(lat: number, lon: number): Promise<NearbyAmenity[] | null> {
  try {
    const query = `[out:json][timeout:25];
(
  nwr["shop"="supermarket"](around:800,${lat},${lon});
  nwr["shop"="grocery"](around:800,${lat},${lon});
  nwr["amenity"="grocery"](around:800,${lat},${lon});
  nwr["shop"="convenience"](around:800,${lat},${lon});
  nwr["shop"="laundry"](around:800,${lat},${lon});
  nwr["amenity"="laundry"](around:800,${lat},${lon});
  nwr["amenity"="washing_machine"](around:800,${lat},${lon});
  nwr["highway"="bus_stop"](around:800,${lat},${lon});
  nwr["public_transport"="stop_position"](around:800,${lat},${lon});
  nwr["public_transport"="platform"](around:800,${lat},${lon});
  nwr["amenity"="pharmacy"](around:800,${lat},${lon});
  nwr["amenity"="cafe"](around:800,${lat},${lon});
  nwr["shop"="coffee"](around:800,${lat},${lon});
  nwr["amenity"="bicycle_parking"](around:800,${lat},${lon});
  nwr["amenity"="bicycle_rental"](around:800,${lat},${lon});
  nwr["amenity"="atm"](around:800,${lat},${lon});
);
out center;`;

    const elements = await queryOverpass(query);
    if (!elements) return null;

    const raw: NearbyAmenity[] = [];

    for (const el of elements) {
      const tags = el.tags ?? {};
      const cat = categorize(tags);
      if (!cat) continue;

      let eLat: number | undefined;
      let eLon: number | undefined;
      if (el.type === 'node') {
        eLat = el.lat;
        eLon = el.lon;
      } else if (el.center) {
        eLat = el.center.lat;
        eLon = el.center.lon;
      }
      if (eLat == null || eLon == null) continue;

      const dist = Math.round(haversineMeters(lat, lon, eLat, eLon));
      const name = tags.name ?? tags.brand ?? tags.operator ?? capitalizeTag(tags.amenity ?? tags.shop ?? 'Unknown');

      raw.push({ category: cat, name, distanceMeters: dist, osmId: el.id });
    }

    // Deduplicate transit: if two in same category within 20m, keep named one
    const deduped: NearbyAmenity[] = [];
    for (const item of raw) {
      const dup = deduped.find(d =>
        d.category === item.category &&
        Math.abs(d.distanceMeters - item.distanceMeters) < 20
      );
      if (dup) {
        if (item.name !== 'Unknown' && dup.name === 'Unknown') {
          deduped[deduped.indexOf(dup)] = item;
        }
      } else {
        deduped.push(item);
      }
    }

    // Keep closest 3 per category
    const byCat = new Map<string, NearbyAmenity[]>();
    for (const item of deduped) {
      const arr = byCat.get(item.category) ?? [];
      arr.push(item);
      byCat.set(item.category, arr);
    }

    const result: NearbyAmenity[] = [];
    for (const [, items] of byCat) {
      items.sort((a, b) => a.distanceMeters - b.distanceMeters);
      result.push(...items.slice(0, 3));
    }

    result.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return result;
  } catch {
    return null;
  }
}
