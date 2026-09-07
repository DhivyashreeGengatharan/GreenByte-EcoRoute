import axios from "axios";

/**
 * Enhanced routing API client for GreenByte.
 * Consolidates abort logic, error handling, and correct local endpoint defaults.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API_URL = `${API_BASE}/api/route`;

export interface RouteRequest {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
}

export interface RoutePoint {
  lat: number;
  lon: number;
  aqi?: number;
}

export interface RouteSegment {
  start: [number, number];
  end: [number, number];
  distanceKm: number;
  carbon: number;
  exposureIndex?: number;
  aqi?: number;
}

export interface RouteSummary {
  distanceKm: number;
  durationMin: number;
  carbon: number;
  averageAQI?: number;
}

export interface Route {
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  path: { lat: number; lng: number; aqi?: number }[];
  summary: RouteSummary;
  segments: RouteSegment[];
}

export interface InterventionZone {
  lat: number;
  lon: number;
  aqi: number;
  type: 'high' | 'moderate';
  exposureIndex?: number;
}

export interface RouteResponse {
  success: boolean;
  routes: Route[];
  ecoRouteId: string;
  shortestRouteId: string;
  optimizationTriggered: boolean;
  rewards: {
    carbonSavedKg: number;
    creditsEarned: number;
    ecoBonusCredits?: number;
  };
  comparison: {
    differencePercent: number;
    classification: string;
  };
  interventionZones: InterventionZone[];
  hotspotLocation: { lat: number; lng: number } | null;
  processingTimeMs?: number;
  routeLabels?: {
    [routeId: string]: string;
  };
  routeSources?: {
    [routeId: string]: string;
  };
  error?: string;
}

export async function calculateRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): Promise<RouteResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for long routes

  console.log(`[Frontend] Requesting route from ${API_URL}...`);
  
  try {
    const res = await axios.post<RouteResponse>(
      API_URL,
      { origin, destination },
      {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    clearTimeout(timeoutId);
    const data = res.data;

    // The backend is expected to return { success: true, ... }
    if (!data.success && data.error) {
      throw new Error(data.error);
    }

    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error("No routes found for the selected locations.");
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
      throw new Error("Request timed out. Long routes may take up to 30-60 seconds to process.");
    }

    if (axios.isAxiosError(err)) {
      if (err.response) {
        throw new Error(err.response.data?.error || `Server error: ${err.response.status}`);
      } else if (err.request) {
        throw new Error("Network error: Could not reach the server at " + API_URL);
      }
    }

    throw new Error(err.message || "An unexpected error occurred.");
  }
}
