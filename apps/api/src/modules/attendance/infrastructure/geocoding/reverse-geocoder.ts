import { Injectable, Logger } from '@nestjs/common';

export interface GeocodeResult {
  address: string | null;
  /** Where the address came from. */
  source: 'google' | 'osm' | 'none';
}

interface CacheEntry {
  at: number;
  value: GeocodeResult;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 2000;

/**
 * A readable address for a pair of coordinates.
 *
 * With GOOGLE_MAPS_API_KEY set it asks Google's Geocoding API, which knows buildings, roads and landmarks in India
 * far better than OpenStreetMap. Without a key, or when Google has nothing, it falls back to OpenStreetMap and builds
 * the address from its parts. The key stays on the server; the browser only ever asks this API.
 */
@Injectable()
export class ReverseGeocoder {
  private readonly logger = new Logger(ReverseGeocoder.name);
  private readonly cache = new Map<string, CacheEntry>();

  async lookup(latitude: number, longitude: number): Promise<GeocodeResult> {
    // About 11 m per cell: people clocking in from the same desk share one answer
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < DAY_MS) return hit.value;

    let value: GeocodeResult = { address: null, source: 'none' };
    const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (googleKey) {
      const g = await this.fromGoogle(latitude, longitude, googleKey);
      if (g) value = { address: g, source: 'google' };
    }
    if (!value.address) {
      const o = await this.fromOsm(latitude, longitude);
      if (o) value = { address: o, source: 'osm' };
    }

    // An empty answer may be a passing failure: do not remember it
    if (value.address) {
      if (this.cache.size >= MAX_CACHE) this.cache.delete(this.cache.keys().next().value as string);
      this.cache.set(key, { at: Date.now(), value });
    }
    return value;
  }

  private async fromGoogle(lat: number, lng: number, apiKey: string): Promise<string | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        this.logger.warn(`Google Geocoding answered HTTP ${res.status}`);
        return null;
      }
      const body = (await res.json()) as {
        status?: string;
        error_message?: string;
        results?: Array<{ formatted_address?: string; types?: string[] }>;
      };
      if (body.status && body.status !== 'OK') {
        if (body.status !== 'ZERO_RESULTS') this.logger.warn(`Google Geocoding: ${body.status}${body.error_message ? ` - ${body.error_message}` : ''}`);
        return null;
      }
      // The first result is the most exact; a bare "plus code" is not an address a person can use
      const best = (body.results ?? []).find((r) => r.formatted_address && !(r.types ?? []).includes('plus_code'));
      return best?.formatted_address ?? null;
    } catch (err) {
      this.logger.warn(`Google Geocoding failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async fromOsm(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`;
      // Nominatim's usage policy asks for a User-Agent that says who is calling
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'VernoxyPulse/1.0 (attendance location)' }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      const j = (await res.json()) as { display_name?: string; address?: Record<string, string> };
      return composeOsmAddress(j.address) ?? j.display_name ?? null;
    } catch (err) {
      this.logger.warn(`OpenStreetMap lookup failed: ${(err as Error).message}`);
      return null;
    }
  }
}

/** House, road, area, city, state and pin code, in the order a person reads them, without repeats. */
export function composeOsmAddress(a?: Record<string, string>): string | null {
  if (!a) return null;
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const place = a.amenity || a.building || a.shop || a.tourism || a.leisure || a.office;
  const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
  const city = a.city || a.town || a.village || a.municipality || a.county;
  const parts = [place, street, area, city, a.state, a.postcode].filter((p): p is string => Boolean(p));
  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return unique.length ? unique.join(', ') : null;
}
