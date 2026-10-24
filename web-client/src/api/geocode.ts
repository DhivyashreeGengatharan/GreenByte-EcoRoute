/**
 * Geocoding API client for EcoRoute.
 * Deterministically requests English results ('accept-language=en') across all browsers,
 * OS locales, and environments.
 * Routes all forward and reverse geocoding through the backend /api/geocode proxy,
 * with a resilient fallback directly to Nominatim with accept-language=en.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export interface GeocodeLocation {
  place_id?: number | string;
  name?: string;
  display_name: string;
  lat: string | number;
  lon: string | number;
  address?: Record<string, string>;
}

/**
 * Format an English display name into concise primary and secondary label.
 */
export function formatLocationName(item: { display_name?: string; name?: string }): { primary: string; secondary: string } {
  if (!item || !item.display_name) {
    return { primary: "Selected Point", secondary: "" };
  }
  const parts = item.display_name.split(',').map((s) => s.trim());
  const primary = item.name || parts[0] || "Location";
  const secondary = parts.slice(1).join(', ') || item.display_name;
  return { primary, secondary };
}

/**
 * Forward Geocoding: Search for places matching the query string.
 * Strictly guarantees English results (accept-language=en).
 */
export async function searchLocations(query: string, limit: number = 5): Promise<GeocodeLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // 1. Primary route: backend proxy
  try {
    const res = await fetch(
      `${API_BASE}/api/geocode?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (proxyError) {
    console.warn("[Geocode API] Backend proxy forward query failed, attempting direct fallback:", proxyError);
  }

  // 2. Fallback: direct Nominatim with mandatory accept-language=en
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=${limit}&accept-language=en`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (fallbackError) {
    console.error("[Geocode API] Direct fallback also failed:", fallbackError);
  }

  return [];
}

/**
 * Reverse Geocoding: Look up English place name for geographic coordinates.
 * Strictly guarantees English results (accept-language=en).
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // 1. Primary route: backend proxy
  try {
    const res = await fetch(
      `${API_BASE}/api/geocode?lat=${lat}&lon=${lon}`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (proxyError) {
    console.warn("[Geocode API] Backend proxy reverse query failed, attempting direct fallback:", proxyError);
  }

  // 2. Fallback: direct Nominatim with mandatory accept-language=en
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (fallbackError) {
    console.error("[Geocode API] Direct reverse fallback failed:", fallbackError);
  }

  return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
}
