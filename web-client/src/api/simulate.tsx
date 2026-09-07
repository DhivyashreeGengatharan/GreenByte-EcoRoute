import axios from "axios";

// Ensure this matches your Vite environment variable or defaults to localhost
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const SIMULATE_URL = `${API_BASE}/api/simulate`;

/* ─────────────────── REQUEST INTERFACE ─────────────────── */
// This matches exactly what the backend expects in req.body
export interface SimulationRequest {
  blockId: number;
  intervention: string; // "Green Wall" | "Algae Panel" | etc.
  currentAQI: number;
  userId?: string;

  // Context Data needed for the physics engine & AI
  buildingDensity: string | null;
  areaType: string | null;
  treeDensity: string | null;
  treeCount: number;
  traffic: string | null; // Added traffic context
  lat: number;            // Required for fetching History
  lon: number;            // Required for fetching History
}

/* ─────────────────── RESPONSE INTERFACES ─────────────────── */

// The structure of the AI's detailed response
export interface AIInsightData {
  headline: string;
  content: string;
  tech_specs: string;
  recommendation: string;
}

// The full response object from the server
export interface SimulationResult {
  newAQI: number;
  reductionAmount: number;
  credits: number;
  estimatedCost: number; // Added (Financials)

  // Can be a string (if legacy/fallback) or the detailed object (if AI succeeds)
  aiInsight: string | AIInsightData;

  estimatedDays: number;

  // Data Arrays for the Dashboard Graphs
  dailyAQIHistory: number[]; // 30-day past trend
  trafficHistory: number[];  // 30-day past trend
  aqiForecast: number[];     // 7-day future prediction
  trafficForecast: number[]; // 7-day future prediction
}

/* ─────────────────── API FUNCTION ─────────────────── */
export async function runSimulation(payload: SimulationRequest): Promise<SimulationResult> {
  try {
    console.log("Calling backend:", SIMULATE_URL);
    const res = await axios.post<SimulationResult>(
      `${API_BASE}/api/simulate`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if ((res.data as any).success === false) {
      throw new Error((res.data as any).error || 'Simulation failed');
    }

    return res.data;
  } catch (err: any) {
    console.error("Error running simulation:", err);
    throw err; // Re-throw the error for the caller to handle
  }
}