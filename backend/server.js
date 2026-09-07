/* ═══════════════════════════════════════════════════════════════════
  Pollution-Aware Route Planning — Backend Server
  Environmental Route Evaluation System using Real-Time Data
  ═══════════════════════════════════════════════════════════════════ */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const authRoutes = require('./routes/auth');
const carbonRoutes = require('./routes/carbon');
const { connectDB } = require('./models/User');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Optional: MongoDB connection (only needed for carbon storage/auth)
connectDB().catch(err => console.warn('⚠️ MongoDB offline (routing still works):', err.message));

app.use('/auth', authRoutes);
app.use('/carbon', carbonRoutes);
app.get('/test', (req, res) => res.json({ status: 'ok', message: 'Backend reachable' }));

/* ─────────────────── CONFIG ─────────────────── */

const { MAPBOX_ACCESS_TOKEN, JWT_SECRET, MONGODB_URI } = process.env;

/* ── Timeouts ── */
const OSRM_TIMEOUT = 20000;
const CARBON_FACTOR_TIMEOUT = 5000;
const FAST_API_TIMEOUT = 3000;
const MAPBOX_TIMEOUT = 3000;

/* ── OSRM servers (tried in order, failover on error) ── */
const OSRM_SERVERS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
];

/* ── Scoring model config — change here to retune, nowhere else ── */
const SCORING = {
  AQI_MAX: 500,   // US AQI scale ceiling
  TEMP_MAX: 45,    // °C — reasonable global max for exposure scoring
  BUILDING_MAX: 200,   // Mapbox tilequery limit param matches this
  DEFAULT_DENSITY: 40,  // fallback value (0.2 score) if token is missing
  WEIGHTS: {
    aqi: 0.4,
    traffic: 0.3,
    density: 0.2,
    weather: 0.1,
  },
  FREE_FLOW_KMH: {
    highway: 100,  // >200km routes
    mixed: 80,  // 50–200km routes
    urban: 50,  // <50km routes
  },
};

/* ── Route generation config ── */
const ROUTE_CONFIG = {
  LONG_ROUTE_KM: 200,
  VERY_LONG_ROUTE_KM: 800,
  MAX_ROUTES_SHORT: 4,
  MAX_ROUTES_LONG: 2,
  MAX_ROUTES_VERY_LONG: 2,
  SIMILARITY_THRESHOLD: 0.08,
  HOTSPOT_MIN_SPREAD_KM: 2,
  HOTSPOT_COUNT_SHORT: 3,
  HOTSPOT_COUNT_LONG: 2,
  MAX_ROUTE_LENGTH_MULTIPLIER: 1.3,
  ECO_DETOUR_THRESHOLD_KM: 150,
  MAX_DETOUR_MULTIPLIER_LONG: 1.2,
};

/* ── Intervention zone config ── */
const INTERVENTION = {
  EXPOSURE_THRESHOLD: 0.35,
  HIGH_EXPOSURE_THRESHOLD: 0.50,
  MAX_ZONES: 5,
  MIN_SPREAD_KM: 1.5,
};

/* ─────────────────── AUTH MIDDLEWARE ─────────────────── */

const { verifyToken } = require('./middleware/authMiddleware');
const requireAuth = (req, res, next) => verifyToken(req, res, next);

/* ─────────────────── GEO UTILITIES ─────────────────── */

function isRouteSimilar(routeA, routeB, threshold = ROUTE_CONFIG.SIMILARITY_THRESHOLD) {
  if (!routeA?.summary?.totalDistance || !routeB?.summary?.totalDistance) return false;
  const d1 = routeA.summary.totalDistance;
  const d2 = routeB.summary.totalDistance;
  const distDiff = Math.abs(d1 - d2) / Math.max(d1, d2);
  if (distDiff >= threshold) return false;

  const coordsA = routeA.geometry?.coordinates;
  const coordsB = routeB.geometry?.coordinates;
  if (!coordsA?.length || !coordsB?.length) return distDiff < threshold;

  const midA = coordsA[Math.floor(coordsA.length / 2)];
  const midB = coordsB[Math.floor(coordsB.length / 2)];
  const midpointDist = haversine(midA[1], midA[0], midB[1], midB[0]);

  return midpointDist < 1.0;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return Math.atan2(y, x);
}

function offsetCoordinate(lat, lon, bearing, distanceKm) {
  const R = 6371;
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const angDist = distanceKm / R;
  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(angDist) +
    Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearing));
  const newLon = lonRad + Math.atan2(
    Math.sin(bearing) * Math.sin(angDist) * Math.cos(latRad),
    Math.cos(angDist) - Math.sin(latRad) * Math.sin(newLat));
  return { lat: newLat * 180 / Math.PI, lon: newLon * 180 / Math.PI };
}

/* ─────────────────── ADAPTIVE SAMPLING ─────────────────── */

function getMaxSamples(routeLengthKm) {
  if (routeLengthKm > 1000) return 4;
  if (routeLengthKm > 500) return 6;
  if (routeLengthKm > 200) return 10;
  if (routeLengthKm > 50) return 20;
  return 40;
}

function getAdaptiveSampleIndices(coordsLength, maxSamples) {
  if (coordsLength <= maxSamples)
    return Array.from({ length: coordsLength }, (_, i) => i);
  const step = (coordsLength - 1) / (maxSamples - 1);
  const indices = [];
  for (let i = 0; i < maxSamples; i++) indices.push(Math.round(i * step));
  return [...new Set(indices)];
}

/* ─────────────────── ENVIRONMENTAL DATA FETCHERS ─────────────────── */

async function fetchBuildingDensity(lat, lon) {
  /* ── TOKEN GUARD: Skip API call if token is missing or placeholder ── */
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'your_mapbox_public_token_here' || !MAPBOX_ACCESS_TOKEN.startsWith('pk.')) {
    console.log(`[BUILDING] No valid Mapbox token — using default density (${SCORING.DEFAULT_DENSITY})`);
    return SCORING.DEFAULT_DENSITY;
  }

  try {
    const res = await axios.get(
      `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json`,
      {
        params: {
          radius: 500,
          limit: SCORING.BUILDING_MAX,
          layers: 'building',
          access_token: MAPBOX_ACCESS_TOKEN,
        },
        timeout: MAPBOX_TIMEOUT,
      }
    );
    const count = res.data?.features?.length ?? 0;
    console.log(`[BUILDING] ${count} buildings near ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    return count;
  } catch (e) {
    console.log(`[BUILDING] Mapbox failed: ${e.message}`);
    return 0;
  }
}

/**
 * Fetch AQI, temperature, and building density for a single coordinate.
 * Traffic is supplied externally as localSpeedMs (from OSRM annotations)
 * so it varies per segment rather than being a flat route average.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number|null} localSpeedMs  — per-segment speed in m/s from OSRM annotations
 */
async function fetchCarbonFactors(lat, lon, localSpeedMs = null) {
  const [aqiRes, weatherRes, buildingRes] = await Promise.allSettled([
    axios.get(
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5`,
      { timeout: CARBON_FACTOR_TIMEOUT }
    ),
    axios.get(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}&current=temperature_2m`,
      { timeout: CARBON_FACTOR_TIMEOUT }
    ),
    fetchBuildingDensity(lat, lon),
  ]);

  let realTimeAQI = 50;
  let temperature = 20;
  let buildingCount = 0;
  let trafficRatio = 1.0;

  if (aqiRes.status === 'fulfilled' && aqiRes.value.data?.current?.us_aqi != null)
    realTimeAQI = aqiRes.value.data.current.us_aqi;

  if (weatherRes.status === 'fulfilled' && weatherRes.value.data?.current?.temperature_2m != null)
    temperature = weatherRes.value.data.current.temperature_2m;

  if (buildingRes.status === 'fulfilled')
    buildingCount = Math.min(Number(buildingRes.value) || 0, SCORING.BUILDING_MAX);

  /* ── Per-segment traffic from OSRM annotation speed ── */
  if (localSpeedMs !== null && localSpeedMs >= 0) {
    const localSpeedKmh = localSpeedMs * 3.6;
    const freeFlow =
      localSpeedKmh > SCORING.FREE_FLOW_KMH.mixed
        ? SCORING.FREE_FLOW_KMH.highway
        : localSpeedKmh > SCORING.FREE_FLOW_KMH.urban
          ? SCORING.FREE_FLOW_KMH.mixed
          : SCORING.FREE_FLOW_KMH.urban;
    trafficRatio = Math.min(localSpeedKmh / freeFlow, 1.0);
    console.log(`[TRAFFIC] Local: ${localSpeedKmh.toFixed(1)}km/h, free-flow: ${freeFlow}km/h → ratio ${trafficRatio.toFixed(2)}`);
  } else {
    console.warn(`[TRAFFIC] No per-segment speed — defaulting ratio to 1.0`);
  }

  return { realTimeAQI, trafficRatio, buildingCount, temperature };
}

/* ═══════════════════════════════════════════════════════════════════
  CARBON EXPOSURE SCORE
  Formula: Carbon_segment = Distance × (W_aqi×AQI + W_traffic×Traffic
                                        + W_density×Density + W_weather×Weather)
  All weights come from SCORING.WEIGHTS — no magic numbers in the formula.
  ═══════════════════════════════════════════════════════════════════ */

async function calculateCarbonScore(routeGeometry, routeLengthKm = 0, annotationSpeeds = []) {
  if (!routeGeometry?.coordinates || routeGeometry.coordinates.length < 2)
    return { score: 0, segments: [], sampledPoints: 0 };

  const coords = routeGeometry.coordinates;

  if (routeLengthKm <= 0) {
    routeLengthKm = coords.reduce((sum, c, i) => {
      if (i === 0) return 0;
      return sum + haversine(coords[i - 1][1], coords[i - 1][0], c[1], c[0]);
    }, 0);
  }

  const maxSamples = getMaxSamples(routeLengthKm);
  const sampleIndices = getAdaptiveSampleIndices(coords.length, maxSamples);
  console.log(`[CARBON] ${coords.length} coords, ${routeLengthKm.toFixed(0)}km, ${sampleIndices.length} samples`);

  /* Fetch all sample points in parallel — each gets its own per-segment speed */
  const sampleResults = await Promise.allSettled(
    sampleIndices.map(idx => {
      const [lon, lat] = coords[idx];
      const speedMs = annotationSpeeds[idx] ?? null;  // per-coord speed from OSRM
      return fetchCarbonFactors(lat, lon, speedMs);
    })
  );

  const factorMap = new Map();
  sampleIndices.forEach((coordIdx, mapIdx) => {
    const result = sampleResults[mapIdx];
    factorMap.set(
      coordIdx,
      result.status === 'fulfilled'
        ? result.value
        : { realTimeAQI: 50, trafficRatio: 1.0, buildingCount: 0, temperature: 20 }
    );
  });

  let totalCarbonScore = 0;
  const segments = [];
  const { WEIGHTS, AQI_MAX, BUILDING_MAX, TEMP_MAX } = SCORING;

  // Pre-build sorted sample coord array for fast nearest lookup
  const sortedSamples = [...factorMap.entries()].map(([idx, data]) => ({
    idx,
    lat: coords[idx][1],
    lon: coords[idx][0],
    data,
  }));

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const segmentLength = haversine(lat1, lon1, lat2, lon2);

    /* Find nearest sampled factors for this segment */
    let factors;
    if (factorMap.has(i)) {
      factors = factorMap.get(i);
    } else {
      // Fast nearest: only check sample points, not all coords in original geometry
      const midLat = (lat1 + lat2) / 2;
      const midLon = (lon1 + lon2) / 2;
      let minDist = Infinity;
      let nearestFactors = { realTimeAQI: 50, trafficRatio: 1.0, buildingCount: 0, temperature: 20 };
      for (const s of sortedSamples) {
        const dist = haversine(midLat, midLon, s.lat, s.lon);
        if (dist < minDist) { minDist = dist; nearestFactors = s.data; }
      }
      factors = nearestFactors;
    }

    /* Normalise each factor to [0, 1] using config ceilings */
    const aqiFactor = Math.min(Math.max(factors.realTimeAQI / AQI_MAX, 0), 1);
    const trafficFactor = Math.min(Math.max(1 - factors.trafficRatio, 0), 1);
    const densityFactor = Math.min(Math.max(factors.buildingCount / BUILDING_MAX, 0), 1);
    const weatherFactor = Math.min(Math.max(factors.temperature / TEMP_MAX, 0), 1);

    /* Weighted exposure index — weights from SCORING.WEIGHTS */
    const exposureIndex =
      WEIGHTS.aqi * aqiFactor +
      WEIGHTS.traffic * trafficFactor +
      WEIGHTS.density * densityFactor +
      WEIGHTS.weather * weatherFactor;

    const carbonScore = segmentLength * exposureIndex;
    totalCarbonScore += carbonScore;

    segments.push({
      start: [lat1, lon1],
      end: [lat2, lon2],
      aqi: factors.realTimeAQI,
      length: segmentLength,
      score: carbonScore,
      exposureIndex,
      carbonFactors: { aqiFactor, trafficFactor, densityFactor, weatherFactor },
    });
  }

  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  console.log(`[CARBON] Segment loop done: ${segments.length} segments processed`);
  console.log(`[CARBON] Score: ${totalCarbonScore.toFixed(2)}, route: ${totalLength.toFixed(1)}km`);

  // Downsample segments for large routes before returning
  const maxSegs = routeLengthKm > 1000 ? 200 : routeLengthKm > 500 ? 300 : 500;
  const finalSegments = downsampleSegments(segments, maxSegs);
  console.log(`[CARBON] Segments: ${segments.length} → ${finalSegments.length} (downsampled)`);

  return { score: totalCarbonScore, segments: finalSegments, sampledPoints: sampleIndices.length };
}

/* ─────────────────── ROUTE BUILDING ─────────────────── */

function classifyEcoDifference(diffPct) {
  if (diffPct <= -5) return 'cleaner';
  if (diffPct >= 5) return 'worse';
  return 'similar';
}

function downsampleSegments(segments, maxSegments = 500) {
  if (segments.length <= maxSegments) return segments;
  const step = (segments.length - 1) / (maxSegments - 1);
  const result = [];
  for (let i = 0; i < maxSegments; i++) {
    result.push(segments[Math.round(i * step)]);
  }
  return result;
}

async function buildRouteObjectFromOsrm(routeData, id, type) {
  const geometry = routeData.geometry;
  const distance = routeData.distance / 1000;

  /* Extract per-coordinate speeds from OSRM leg annotations (m/s) */
  const annotationSpeeds = routeData.legs?.flatMap(leg => leg.annotation?.speed ?? []) ?? [];
  if (annotationSpeeds.length > 0)
    console.log(`[OSRM] ${annotationSpeeds.length} per-segment speeds available`);
  else
    console.warn(`[OSRM] No annotation speeds — traffic factor will default to 1.0`);

  const { score: carbonScore, segments, sampledPoints } =
    await calculateCarbonScore(geometry, distance, annotationSpeeds);

  const avgAQI = segments.length > 0
    ? segments.reduce((s, seg) => s + seg.aqi, 0) / segments.length
    : 50;

  // FIX: For large routes skip per-point AQI lookup and downsample path
  // This avoids massive JSON payloads and improves frontend rendering
  const LARGE_ROUTE_THRESHOLD = 5000;
  const MAX_PATH_POINTS = 1000; // max path and geometry points to send to frontend
  let path;

  if (geometry.coordinates.length > LARGE_ROUTE_THRESHOLD) {
    console.log(`[PATH] Large route (${geometry.coordinates.length} coords) — downsampling path to ${MAX_PATH_POINTS} points`);

    // Downsample coordinates for path
    const step = (geometry.coordinates.length - 1) / (MAX_PATH_POINTS - 1);
    const sampledCoords = [];
    for (let i = 0; i < MAX_PATH_POINTS; i++) {
      sampledCoords.push(geometry.coordinates[Math.round(i * step)]);
    }

    path = sampledCoords.map(([lon, lat]) => ({ lat, lng: lon, aqi: Math.round(avgAQI) }));
  } else {
    // Normal route: per-point AQI mapping
    path = geometry.coordinates.map(([lon, lat]) => {
      let nearestAqi = 50, minDist = Infinity;
      for (const seg of segments) {
        const midLat = (seg.start[0] + seg.end[0]) / 2;
        const midLon = (seg.start[1] + seg.end[1]) / 2;
        const dist = haversine(lat, lon, midLat, midLon);
        if (dist < minDist) { minDist = dist; nearestAqi = seg.aqi; }
      }
      return { lat, lng: lon, aqi: nearestAqi };
    });
  }

  // Downsample geometry for large routes — Leaflet renders fine with 1000 points
  let finalGeometry = geometry;
  if (geometry.coordinates.length > LARGE_ROUTE_THRESHOLD) {
    const step = (geometry.coordinates.length - 1) / (MAX_PATH_POINTS - 1);
    const sampledCoords = [];
    for (let i = 0; i < MAX_PATH_POINTS; i++) {
      sampledCoords.push(geometry.coordinates[Math.round(i * step)]);
    }
    finalGeometry = { ...geometry, coordinates: sampledCoords };
    console.log(`[PATH] Geometry downsampled: ${geometry.coordinates.length} → ${sampledCoords.length} coords`);
  }

  return {
    id, type,
    geometry: finalGeometry,
    path,
    summary: {
      totalDistance: distance,
      totalCarbonScore: carbonScore,
      totalPollutionScore: carbonScore,
      averageAQI: Math.round(avgAQI),
      numSamplingPoints: path.length,
      validPoints: sampledPoints,
      duration: routeData.duration,
    },
    segments,
  };
}

/* ─────────────────── OSRM ROUTING ─────────────────── */

async function fetchOSRM(origin, destination, opts = {}) {
  const { waypoints = [], alternatives = true, retries = 2 } = opts;

  let coordString = `${origin.lon},${origin.lat}`;
  waypoints.forEach(wp => { coordString += `;${wp.lon},${wp.lat}`; });
  coordString += `;${destination.lon},${destination.lat}`;

  const altParam = alternatives && waypoints.length === 0 ? '&alternatives=true' : '';

  /* Try each OSRM server in turn */
  for (const server of OSRM_SERVERS) {
    const url = `${server}/route/v1/driving/${coordString}` +
      `?overview=full&geometries=geojson&annotations=speed${altParam}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`[OSRM] ${server} | ${origin.lat.toFixed(4)},${origin.lon.toFixed(4)} → ${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}${waypoints.length ? ` via ${waypoints.length} wp` : ''} (attempt ${attempt + 1})`);
        const res = await axios.get(url, { timeout: OSRM_TIMEOUT });
        if (res.data?.code === 'Ok' && res.data.routes?.length) {
          console.log(`[OSRM] ✓ ${res.data.routes.length} route(s) from ${server}`);
          return res.data;
        }
      } catch (e) {
        console.log(`[OSRM] Attempt ${attempt + 1} on ${server} failed: ${e.message}`);
        if (attempt < retries) await new Promise(r => setTimeout(r, 2000));
      }
    }
    console.log(`[OSRM] ✗ ${server} exhausted, trying next server`);
  }

  console.log(`[OSRM] ✗ All servers failed`);
  return null;
}

async function generateAlternativeViaWaypoint(origin, destination, straightLineDist, strategy = null) {
  const midLat = (origin.lat + destination.lat) / 2;
  const midLon = (origin.lon + destination.lon) / 2;
  const bearing = calculateBearing(origin.lat, origin.lon, destination.lat, destination.lon);

  const offsets = strategy ? [strategy] : [
    { dist: Math.max(0.5, straightLineDist * 0.15), angle: Math.PI / 2 },
    { dist: Math.max(0.5, straightLineDist * 0.15), angle: -Math.PI / 2 },
    { dist: Math.max(1.0, straightLineDist * 0.25), angle: Math.PI / 2 },
    { dist: Math.max(1.0, straightLineDist * 0.25), angle: -Math.PI / 2 },
    { dist: Math.max(0.3, straightLineDist * 0.10), angle: Math.PI / 3 },
    { dist: Math.max(0.3, straightLineDist * 0.10), angle: -Math.PI / 3 },
  ];

  for (const offset of offsets) {
    try {
      const angle = offset.angle ?? (Math.PI / 2);
      const wp = offsetCoordinate(midLat, midLon, bearing + angle, offset.dist);
      console.log(`[ALT] Trying waypoint: [${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}] offset: ${offset.dist.toFixed(1)}km angle: ${(angle * 180 / Math.PI).toFixed(0)}°`);

      const result = await fetchOSRM(origin, destination, { waypoints: [wp], alternatives: false, retries: 1 });
      if (result?.routes?.length) {
        console.log(`[ALT] ✓ Found alternative via waypoint offset ${offset.dist.toFixed(1)}km`);
        return result.routes[0];
      }
      console.log(`[ALT] ✗ No routes for [${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}]`);
    } catch (err) {
      console.log(`[ALT] ✗ Waypoint error: ${err.message}`);
    }
  }

  console.log(`[ALT] ✗ No waypoint alternative found`);
  return null;
}

async function generateHotspotDetour(orig, dest, baseRoute, straightDist, isVeryLong = false) {
  const sortedSegments = [...baseRoute.segments]
    .filter(s => s.length > 0.1)
    .sort((a, b) => (b.exposureIndex || 0) - (a.exposureIndex || 0));

  if (!sortedSegments.length) return null;

  const worstSegment = sortedSegments[0];
  const avgExposure = sortedSegments.reduce((s, seg) => s + (seg.exposureIndex || 0), 0) / sortedSegments.length;

  console.log(`[DETOUR] Worst: ${worstSegment.exposureIndex.toFixed(3)}, Avg: ${avgExposure.toFixed(3)}`);

  // Only skip if route is uniformly very clean — never hard-bail on a fixed threshold
  if (worstSegment.exposureIndex < avgExposure * 1.2 && worstSegment.exposureIndex < 0.2) {
    console.log(`[DETOUR] Route uniformly clean — skipping detour`);
    return null;
  }

  const hotLat = (worstSegment.start[0] + worstSegment.end[0]) / 2;
  const hotLon = (worstSegment.start[1] + worstSegment.end[1]) / 2;

  const bearing = calculateBearing(orig.lat, orig.lon, dest.lat, dest.lon);
  const offsetDist = isVeryLong
    ? Math.min(straightDist * 0.06, 80)
    : Math.min(straightDist * 0.15, 25);

  // First attempt: perpendicular offset from worst hotspot
  for (const angle of [Math.PI / 2, -Math.PI / 2]) {
    const wp = offsetCoordinate(hotLat, hotLon, bearing + angle, offsetDist);
    console.log(`[DETOUR] Trying hotspot bypass at [${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}]`);
    try {
      const result = await fetchOSRM(orig, dest, { waypoints: [wp], alternatives: false, retries: 1 });
      if (result?.routes?.length) {
        const maxMult = isVeryLong ? ROUTE_CONFIG.MAX_DETOUR_MULTIPLIER_LONG : ROUTE_CONFIG.MAX_ROUTE_LENGTH_MULTIPLIER;
        if (result.routes[0].distance / 1000 <= baseRoute.summary.totalDistance * maxMult) {
          console.log(`[DETOUR] ✓ Valid hotspot bypass found`);
          return result.routes[0];
        }
        console.log(`[DETOUR] ✗ Bypass too long`);
      }
    } catch (err) {
      console.log(`[DETOUR] ✗ Bypass error: ${err.message}`);
    }
  }

  // Second attempt: shift entire route via midpoint corridor (forces different highway)
  console.log(`[DETOUR] Perpendicular offsets failed — trying midpoint corridor shift`);
  const midLat = (orig.lat + dest.lat) / 2;
  const midLon = (orig.lon + dest.lon) / 2;

  for (const angle of [Math.PI / 2, -Math.PI / 2]) {
    const wp = offsetCoordinate(midLat, midLon, bearing + angle, offsetDist * 0.8);
    console.log(`[DETOUR] Trying midpoint corridor at [${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}]`);
    try {
      const result = await fetchOSRM(orig, dest, { waypoints: [wp], alternatives: false, retries: 1 });
      if (result?.routes?.length) {
        const maxMult = isVeryLong ? ROUTE_CONFIG.MAX_DETOUR_MULTIPLIER_LONG : ROUTE_CONFIG.MAX_ROUTE_LENGTH_MULTIPLIER;
        if (result.routes[0].distance / 1000 <= baseRoute.summary.totalDistance * maxMult) {
          console.log(`[DETOUR] ✓ Midpoint corridor shift found`);
          return result.routes[0];
        }
        console.log(`[DETOUR] ✗ Midpoint corridor too long`);
      }
    } catch (err) {
      console.log(`[DETOUR] ✗ Midpoint error: ${err.message}`);
    }
  }

  return null;
}

/* ─────────────────── API ENDPOINTS ─────────────────── */

app.get('/api/geocode', async (req, res) => {
  const { q, lat, lon, limit = 5, zoom = 18 } = req.query;

  // Support reverse geocoding if lat & lon are provided
  if (lat && lon) {
    try {
      const result = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon,
          format: 'json',
          addressdetails: 1,
          zoom,
          'accept-language': 'en'
        },
        headers: {
          'User-Agent': 'EcoRoute-PollutionAwareRoutePlanner/1.0 (ecoroute@greenbyte.io)',
          'Accept-Language': 'en'
        },
        timeout: 6000,
      });
      return res.json(result.data);
    } catch (err) {
      console.error('[GEOCODE REVERSE] Error:', err.message);
      return res.status(500).json({ error: 'Reverse geocode failed' });
    }
  }

  if (!q) return res.status(400).json({ error: 'Missing query (q) or coordinates (lat, lon)' });

  try {
    const result = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q,
        format: 'json',
        limit: Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20),
        addressdetails: 1,
        'accept-language': 'en'
      },
      headers: {
        'User-Agent': 'EcoRoute-PollutionAwareRoutePlanner/1.0 (ecoroute@greenbyte.io)',
        'Accept-Language': 'en'
      },
      timeout: 6000,
    });
    res.json(result.data);
  } catch (err) {
    console.error('[GEOCODE] Error:', err.message);
    res.status(500).json({ error: 'Geocode failed' });
  }
});

app.get('/api/geocode/reverse', async (req, res) => {
  const { lat, lon, zoom = 18 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing coordinates (lat, lon)' });
  try {
    const result = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1,
        zoom,
        'accept-language': 'en'
      },
      headers: {
        'User-Agent': 'EcoRoute-PollutionAwareRoutePlanner/1.0 (ecoroute@greenbyte.io)',
        'Accept-Language': 'en'
      },
      timeout: 6000,
    });
    res.json(result.data);
  } catch (err) {
    console.error('[GEOCODE REVERSE] Error:', err.message);
    res.status(500).json({ error: 'Reverse geocode failed' });
  }
});

app.get('/api/block-data', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing coords' });
  try {
    /* Block-data has no route context so traffic defaults to 1.0 — expected */
    const factors = await fetchCarbonFactors(+lat, +lon, null);
    let traffic = 'Normal Flow';
    if (factors.trafficRatio < 0.5) traffic = 'Severe Traffic';
    else if (factors.trafficRatio < 0.75) traffic = 'Heavy Traffic';
    res.json({ aqi: factors.realTimeAQI, traffic, temperature: factors.temperature });
  } catch (err) {
    res.status(500).json({ error: 'Block data failed' });
  }
});

app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ success: true, message: 'You have access to protected data', user: req.user });
});

/* ═════════════════════════════════════════════════════════════════
  POST /api/route — MAIN ROUTING ENDPOINT
  ═════════════════════════════════════════════════════════════════ */

app.post('/api/route', async (req, res) => {
  console.log('🔥 ROUTE HIT', new Date().toISOString(), 'from', req.headers.origin || 'unknown');
  const startTime = Date.now();
  try {
    console.log('\n═══ ROUTE REQUEST ═══');
    const { origin, destination } = req.body;
    if (!origin || !destination)
      return res.status(400).json({ error: 'Missing origin or destination' });

    const oLat = Number(origin.lat), oLon = Number(origin.lon);
    const dLat = Number(destination.lat), dLon = Number(destination.lon);
    if ([oLat, oLon, dLat, dLon].some(isNaN))
      return res.status(400).json({ error: 'Invalid coordinates' });

    let ecoRoute = null;
    let shortestRouteId = null;
    let efficiencyDiff = 0;
    let shortScore = 0;
    let ecoScore = 0;
    let classification = 'similar';
    let diffPct = 0;

    const straightDist = haversine(oLat, oLon, dLat, dLon);
    console.log(`[ROUTE] Straight-line: ${straightDist.toFixed(1)} km`);

    const orig = { lat: oLat, lon: oLon };
    const dest = { lat: dLat, lon: dLon };
    const isLongRoute = straightDist > ROUTE_CONFIG.LONG_ROUTE_KM;
    const isVeryLongRoute = straightDist > ROUTE_CONFIG.VERY_LONG_ROUTE_KM;

    console.log(`[ROUTE] ${straightDist.toFixed(0)}km — ${isVeryLongRoute ? 'VERY LONG (OSRM-only)' :
        isLongRoute ? 'LONG (limited offsets)' :
          'SHORT (full pipeline)'
      } mode`);

    const osrmData = await fetchOSRM(orig, dest, { alternatives: true, retries: 2 });

    if (!osrmData?.routes?.length) {
      console.log('[ROUTE] ✗ OSRM failed');
      return res.status(200).json({
        routes: [], shortestRouteId: null, ecoRouteId: null,
        comparison: { differencePercent: 0, classification: 'similar' },
        interventionZones: [], fallback: true,
        error: 'Could not find road routes. Try clicking closer to a road.',
        routeLabels: {},
      });
    }

    /* ══════════════════════════════════════════════
      TIER 3: VERY LONG ROUTES (>800km)
      Use OSRM's own native alternatives only.
      Zero waypoint generation. 4 samples per route.
      Expected time: 8-15s
      ══════════════════════════════════════════════ */
    if (isVeryLongRoute) {
      console.log(`[ROUTE] Very long route — scoring OSRM native alternatives only`);

      const routesToScore = osrmData.routes.slice(0, 2);
      const scoredRoutes = await Promise.all(
        routesToScore.map((r, i) =>
          buildRouteObjectFromOsrm(r, `route-${i}`, i === 0 ? 'shortest' : 'eco')
        )
      );

      // Hotspot detour for very long routes when OSRM gave only 1 native route
      if (scoredRoutes.length < 2 && straightDist > ROUTE_CONFIG.ECO_DETOUR_THRESHOLD_KM) {
        console.log(`[ROUTE] Tier 3 — attempting hotspot detour for single-route result`);
        try {
          const detourData = await generateHotspotDetour(orig, dest, scoredRoutes[0], straightDist, true);
          if (detourData) {
            const detourRoute = await buildRouteObjectFromOsrm(detourData, 'route-hotspot-detour', 'hotspot-detour');
            if (detourRoute && !isRouteSimilar(detourRoute, scoredRoutes[0], ROUTE_CONFIG.SIMILARITY_THRESHOLD)) {
              scoredRoutes.push(detourRoute);
              console.log(`[ROUTE] ✓ Tier 3 hotspot detour added: ${detourRoute.summary.totalDistance.toFixed(0)}km`);
            }
          }
        } catch (e) {
          console.log(`[ROUTE] Tier 3 detour failed: ${e.message}`);
        }
      }

      const sortedByDistance = [...scoredRoutes].sort(
        (a, b) => a.summary.totalDistance - b.summary.totalDistance
      );
      const sortedByCarbon = [...scoredRoutes].sort(
        (a, b) => a.summary.totalPollutionScore - b.summary.totalPollutionScore
      );

      const sortedByEfficiency = [...scoredRoutes].sort(
        (a, b) => (a.summary.totalPollutionScore / a.summary.totalDistance) - (b.summary.totalPollutionScore / b.summary.totalDistance)
      );

      const shortestRouteObj = sortedByDistance[0];
      const bestEcoCandidate = sortedByEfficiency[0];

      // Check if the eco candidate is meaningfully cleaner (>5% better efficiency)
      const shortExposure = shortestRouteObj.summary.totalPollutionScore / shortestRouteObj.summary.totalDistance;
      const ecoExposure = bestEcoCandidate.summary.totalPollutionScore / bestEcoCandidate.summary.totalDistance;
      efficiencyDiff = shortExposure > 0 ? ((shortExposure - ecoExposure) / shortExposure) * 100 : 0;

      if (bestEcoCandidate.id !== shortestRouteObj.id && efficiencyDiff > 5) {
        // Genuinely cleaner alternative exists
        ecoRoute = bestEcoCandidate;
      } else {
        // Shortest IS the eco route — don't force a longer detour
        ecoRoute = shortestRouteObj;
        console.log('[ROUTE SELECTION] Shortest route is already the most efficient — eco route is same as shortest');
      }

      const getEnvironmentalValue = (pollution, dist) => {
        if (!dist || dist <= 0) return 0;
        const exposure = pollution / dist;
        const cleanliness = Math.max(0.1, 1 - (exposure * 1.5));
        return Math.round(dist * cleanliness * 5);
      };

      // RETURN ALL ROUTES FOUND FOR VERY LONG ROUTES
      const convertedRoutes = scoredRoutes.map(route => {
        const val = getEnvironmentalValue(route.summary.totalPollutionScore, route.summary.totalDistance);
        return {
          id: route.id,
          type: 'alternative', // temporary, determined below
          geometry: route.geometry,
          path: route.path,
          summary: {
            distanceKm: route.summary.totalDistance,
            durationMin: Math.round(route.summary.duration / 60),
            carbon: val, // Environmental Value Score
            averageAQI: route.summary.averageAQI,
          },
          segments: route.segments,
        };
      });

      // Sort by value score descending — highest score is the recommended one
      const sortedByValue = [...convertedRoutes].sort((a, b) => b.summary.carbon - a.summary.carbon);
      ecoRoute = sortedByValue[0];
      shortestRouteId = scoredRoutes.reduce((prev, curr) => 
        (prev.summary.totalDistance < curr.summary.totalDistance) ? prev : curr).id;

      // Assign final types
      sortedByValue.forEach(r => {
        if (r.id === ecoRoute.id) r.type = 'eco';
        else if (r.id === shortestRouteId) r.type = 'shortest';
      });

      const totalCredits = ecoRoute.summary.carbon + 10; // extra bonus for choosing the top path

      console.log(`[RESPONSE-VERYLONG] Returning ${sortedByValue.length} routes to frontend. Eco: ${ecoRoute.id}(Score ${ecoRoute.summary.carbon})`);

      return res.status(200).json({
        success: true,
        routes: sortedByValue,
        shortestRouteId: shortestRouteId,
        ecoRouteId: ecoRoute.id,
        comparison: { differencePercent: 0, classification: 'cleaner' },
        interventionZones: [],
        hotspotLocation: null,
        rewards: {
          carbonSavedKg: 0,
          creditsEarned: totalCredits,
          ecoBonusCredits: 10,
        },
        optimizationTriggered: false,
        processingTimeMs: Date.now() - startTime,
        routeLabels: Object.fromEntries(
          sortedRoutes.map(r => [r.id, r.type])
        ),
        routeSources: Object.fromEntries(
          scoredRoutes.map(r => [r.id, r.source || 'osrm'])
        ),
      });
    }

    /* ══════════════════════════════════════════════
      TIER 1 & 2: SHORT + MEDIUM ROUTES (<800km)
      ══════════════════════════════════════════════ */

    const routeA = await buildRouteObjectFromOsrm(
      osrmData.routes[0], 'route-0', 'shortest'
    );
    console.log(`[ROUTE] Baseline: ${routeA.summary.totalDistance.toFixed(1)}km, Carbon ${routeA.summary.totalPollutionScore.toFixed(2)}`);

    const alternativeRoutes = [{ ...routeA, source: 'osrm-original' }];

    // Cap offset at 25km max to prevent coastal/absurd detours
    const maxOffset = Math.min(Math.max(straightDist * 0.15, 2.0), 25);
    const offsetStrategies = [
      { dist: maxOffset, angle: Math.PI / 2, name: 'offset-right' },
      { dist: maxOffset, angle: -Math.PI / 2, name: 'offset-left' },
      { dist: maxOffset * 1.2, angle: Math.PI / 3, name: 'offset-diagonal-1' },
      { dist: maxOffset * 1.2, angle: -Math.PI / 3, name: 'offset-diagonal-2' },
      { dist: maxOffset * 0.6, angle: Math.PI / 6, name: 'offset-shallow-right' },
      { dist: maxOffset * 0.6, angle: -Math.PI / 6, name: 'offset-shallow-left' },
      { dist: maxOffset * 0.4, angle: Math.PI / 4, name: 'offset-close' },
    ];

    // Strict strategy limits per tier
    const activeStrategies = offsetStrategies.slice(0, isLongRoute ? 2 : 4);

    const tasks = [];

    // Use OSRM's own second route if available
    if (osrmData.routes.length > 1) {
      tasks.push(async () => {
        const r = await buildRouteObjectFromOsrm(
          osrmData.routes[1], 'route-osrm-alt', 'osrm-alternative'
        );
        return { data: r };
      });
    }

    // Waypoint offset alternatives
    activeStrategies.forEach(strategy => {
      tasks.push(async () => {
        try {
          const altRouteData = await generateAlternativeViaWaypoint(
            orig, dest, straightDist, strategy
          );
          if (altRouteData) {
            const r = await buildRouteObjectFromOsrm(
              altRouteData, `route-${strategy.name}`, strategy.name
            );
            return { data: r };
          }
        } catch (e) {
          console.log(`[TASK] Strategy ${strategy.name} failed: ${e.message}`);
        }
        return { data: null };
      });
    });

    const taskResults = await Promise.allSettled(tasks.map(t => t()));

    taskResults.forEach(res => {
      if (res.status === 'fulfilled' && res.value?.data) {
        const builtRoute = res.value.data;

        // Reject routes more than 30% longer than baseline
        if (builtRoute.summary.totalDistance > routeA.summary.totalDistance * ROUTE_CONFIG.MAX_ROUTE_LENGTH_MULTIPLIER) {
          console.log(`[ALT] ✗ Too long: ${builtRoute.summary.totalDistance.toFixed(1)}km vs baseline ${routeA.summary.totalDistance.toFixed(1)}km`);
          return;
        }

        const isTooSimilar = alternativeRoutes.some(
          existing => isRouteSimilar(builtRoute, existing, ROUTE_CONFIG.SIMILARITY_THRESHOLD)
        );
        if (!isTooSimilar) {
          alternativeRoutes.push(builtRoute);
          console.log(`[ALT] ✓ Added: ${builtRoute.id} ${builtRoute.summary.totalDistance.toFixed(1)}km`);
        } else {
          console.log(`[ALT] ✗ Too similar: ${builtRoute.id}`);
        }
      }
    });

    console.log(`[ALT] Pool after dedup: ${alternativeRoutes.length} routes — ${alternativeRoutes.map(r => `${r.id}(${r.summary.totalDistance.toFixed(0)}km)`).join(', ')
      }`);

    const targetTierCount = isLongRoute
      ? ROUTE_CONFIG.MAX_ROUTES_LONG
      : ROUTE_CONFIG.MAX_ROUTES_SHORT;

    // Hotspot avoidance — only for short routes with room for more routes
    if (alternativeRoutes.length < targetTierCount && routeA.segments?.length > 2 && straightDist > ROUTE_CONFIG.ECO_DETOUR_THRESHOLD_KM) {
      const sortedByExposure = [...routeA.segments]
        .filter(s => s.length > 0)
        .sort((a, b) => (b.exposureIndex || 0) - (a.exposureIndex || 0));

      const hotspots = [];
      for (const seg of sortedByExposure) {
        if (hotspots.length >= ROUTE_CONFIG.HOTSPOT_COUNT_SHORT) break;
        const midLat = (seg.start[0] + seg.end[0]) / 2;
        const midLon = (seg.start[1] + seg.end[1]) / 2;
        const tooClose = hotspots.some(
          h => haversine(h.lat, h.lon, midLat, midLon) < ROUTE_CONFIG.HOTSPOT_MIN_SPREAD_KM
        );
        if (!tooClose)
          hotspots.push({ lat: midLat, lon: midLon, aqi: seg.aqi, exposureIndex: seg.exposureIndex || 0 });
      }

      if (hotspots.length > 0) {
        console.log(`[HOTSPOT] ${hotspots.length} hotspot(s), generating avoidance route`);
        try {
          const hotspotRoute = await generateAlternativeViaWaypoint(
            orig, dest, straightDist,
            { name: 'hotspot-avoidance', dist: Math.min(straightDist * 0.2, 25), angle: Math.PI / 2 }
          );
          if (hotspotRoute) {
            const built = await buildRouteObjectFromOsrm(
              hotspotRoute, 'route-hotspot', 'hotspot-avoidance'
            );
            if (
              built &&
              built.summary.totalDistance <= routeA.summary.totalDistance * ROUTE_CONFIG.MAX_ROUTE_LENGTH_MULTIPLIER &&
              !alternativeRoutes.some(e => isRouteSimilar(built, e, ROUTE_CONFIG.SIMILARITY_THRESHOLD))
            ) {
              alternativeRoutes.push({ ...built, source: 'hotspot-avoidance' });
              console.log(`[ALT] ✓ Hotspot avoidance: ${built.summary.totalDistance.toFixed(1)}km`);
            }
          }
        } catch (err) {
          console.log(`[HOTSPOT] ✗ Failed: ${err.message}`);
        }
      }
    }

    // If still only 1 route in pool for routes >150km, try targeted hotspot detour
    if (alternativeRoutes.length < 2 && straightDist > ROUTE_CONFIG.ECO_DETOUR_THRESHOLD_KM) {
      console.log(`[ROUTE] Tier 1/2 — only 1 route in pool, attempting hotspot detour`);
      try {
        const detourData = await generateHotspotDetour(orig, dest, routeA, straightDist, isLongRoute);
        if (detourData) {
          const detourRoute = await buildRouteObjectFromOsrm(detourData, 'route-hotspot-detour', 'hotspot-detour');
          if (
            detourRoute &&
            detourRoute.summary.totalDistance <= routeA.summary.totalDistance * (isLongRoute ? ROUTE_CONFIG.MAX_DETOUR_MULTIPLIER_LONG : ROUTE_CONFIG.MAX_ROUTE_LENGTH_MULTIPLIER) &&
            !alternativeRoutes.some(e => isRouteSimilar(detourRoute, e, ROUTE_CONFIG.SIMILARITY_THRESHOLD))
          ) {
            alternativeRoutes.push({ ...detourRoute, source: 'hotspot-detour' });
            console.log(`[ROUTE] ✓ Tier 1/2 hotspot detour added: ${detourRoute.summary.totalDistance.toFixed(0)}km`);
          }
        }
      } catch (e) {
        console.log(`[ROUTE] Tier 1/2 detour failed: ${e.message}`);
      }
    }

    // Final selection: SHOW ALL ROUTES, not just shortest + eco
    const sortedByDistance = [...alternativeRoutes].sort(
      (a, b) => a.summary.totalDistance - b.summary.totalDistance
    );
    const sortedByCarbon = [...alternativeRoutes].sort(
      (a, b) => a.summary.totalPollutionScore - b.summary.totalPollutionScore
    );

    const shortestRoute = sortedByDistance[0];
    const shortestRouteObj = sortedByDistance[0];
    // Pick based on efficiency (pollution per km) rather than total pollution
    const sortedByEfficiency = [...alternativeRoutes].sort(
      (a, b) => (a.summary.totalPollutionScore / a.summary.totalDistance) - (b.summary.totalPollutionScore / b.summary.totalDistance)
    );
    const bestEcoCandidate = sortedByEfficiency[0];

    // Check if the eco candidate is meaningfully cleaner (>5% better efficiency)
    const shortExposure = shortestRouteObj.summary.totalPollutionScore / shortestRouteObj.summary.totalDistance;
    const ecoExposure = bestEcoCandidate.summary.totalPollutionScore / bestEcoCandidate.summary.totalDistance;
    efficiencyDiff = shortExposure > 0 ? ((shortExposure - ecoExposure) / shortExposure) * 100 : 0;

    if (bestEcoCandidate.id !== shortestRouteObj.id && efficiencyDiff > 5) {
      // Genuinely cleaner alternative exists
      ecoRoute = bestEcoCandidate;
    } else {
      // Shortest IS the eco route — don't force a longer detour
      ecoRoute = shortestRouteObj;
      console.log('[ROUTE SELECTION] Shortest route is already the most efficient — eco route is same as shortest');
    }

    console.log(`[ROUTE SELECTION] Shortest: ${shortestRoute.summary.totalDistance.toFixed(1)}km | Carbon: ${shortestRoute.summary.totalPollutionScore.toFixed(2)}`);
    console.log(`[ROUTE SELECTION] Eco:      ${ecoRoute.summary.totalDistance.toFixed(1)}km | Carbon: ${ecoRoute.summary.totalPollutionScore.toFixed(2)}`);
    console.log(`[ROUTE SELECTION] Total alternatives available: ${alternativeRoutes.length}`);

    ecoScore = ecoRoute.summary.totalPollutionScore || 0;
    shortScore = shortestRouteObj.summary.totalPollutionScore || 0;
    diffPct = shortScore > 0 ? ((shortScore - ecoScore) / shortScore) * 100 : 0;
    classification = classifyEcoDifference(diffPct);

    // Collect intervention zones from ALL routes, not just chosen ones
    const interventionZones = [];
    alternativeRoutes.forEach(route => {
      route.segments.forEach(seg => {
        const ei = seg.exposureIndex || 0;
        if (ei > INTERVENTION.EXPOSURE_THRESHOLD && interventionZones.length < INTERVENTION.MAX_ZONES) {
          const midLat = (seg.start[0] + seg.end[0]) / 2;
          const midLon = (seg.start[1] + seg.end[1]) / 2;
          const tooClose = interventionZones.some(
            z => haversine(z.lat, z.lon, midLat, midLon) < INTERVENTION.MIN_SPREAD_KM
          );
          if (!tooClose) {
            interventionZones.push({
              lat: midLat, lon: midLon, aqi: seg.aqi,
              exposureIndex: ei,
              type: ei > INTERVENTION.HIGH_EXPOSURE_THRESHOLD ? 'high' : 'moderate',
            });
          }
        }
      });
    });

    // Helper for normalized score (Environmental Value: distance * quality)
    const getEnvironmentalValue = (pollution, dist) => {
      if (!dist || dist <= 0) return 0;
      const exposure = pollution / dist;
      const cleanliness = Math.max(0.1, 1 - (exposure * 1.5));
      return Math.round(dist * cleanliness * 5);
    };

    // RETURN ALL ROUTES FOUND
    const convertedRoutes = alternativeRoutes.map(route => {
      const val = getEnvironmentalValue(route.summary.totalPollutionScore, route.summary.totalDistance);
      return {
        id: route.id,
        type: 'alternative', // determined below
        geometry: route.geometry,
        path: route.path,
        summary: {
          distanceKm: route.summary.totalDistance,
          durationMin: Math.round(route.summary.duration / 60),
          carbon: val, // Environmental Value Score
          averageAQI: route.summary.averageAQI,
        },
        segments: route.segments,
      };
    });

    // Final sorting: Highest score is Recommended Eco
    const sortedByValue = [...convertedRoutes].sort((a, b) => b.summary.carbon - a.summary.carbon);
    ecoRoute = sortedByValue[0];
    shortestRouteId = alternativeRoutes.reduce((prev, curr) => 
      (prev.summary.totalDistance < curr.summary.totalDistance) ? prev : curr).id;

    // Final types and labeling
    sortedByValue.forEach(r => {
      if (r.id === ecoRoute.id) r.type = 'eco';
      else if (r.id === shortestRouteId) r.type = 'shortest';
    });

    const hotspotLocation = interventionZones.length > 0
      ? { lat: interventionZones[0].lat, lng: interventionZones[0].lon }
      : null;

    const carbonSavedKg = Math.max(shortScore - ecoScore, 0);
    const totalCredits = ecoRoute.summary.carbon + 10;

    console.log(`[REWARDS] Eco: ${ecoRoute.id}, Score: ${ecoRoute.summary.carbon}, Credits: ${totalCredits}`);
    console.log(`[RESPONSE] Returning ${sortedByValue.length} routes to frontend`);

    res.status(200).json({
      success: true,
      routes: sortedByValue,
      shortestRouteId: shortestRouteId,
      ecoRouteId: ecoRoute.id,
      comparison: { differencePercent: efficiencyDiff, classification },
      interventionZones,
      hotspotLocation,
      rewards: {
        carbonSavedKg: Number(carbonSavedKg.toFixed(4)),
        creditsEarned: totalCredits,
        ecoBonusCredits: 10,
      },
      optimizationTriggered: efficiencyDiff < 0,
      processingTimeMs: Date.now() - startTime,
      routeLabels: Object.fromEntries(
        sortedByValue.map(r => [r.id, r.type])
      ),
      routeSources: Object.fromEntries(
        alternativeRoutes.map(r => [r.id, r.source || 'generated'])
      ),
    });

  } catch (error) {
    console.error('[ROUTE] Error:', error.message);
    res.status(200).json({
      success: false,
      routes: [], shortestRouteId: null, ecoRouteId: null,
      comparison: { differencePercent: 0, classification: 'similar' },
      interventionZones: [], hotspotLocation: null,
      rewards: { carbonSavedKg: 0, creditsEarned: 0, ecoBonusCredits: 0 },
      optimizationTriggered: false,
      error: `Route calculation error: ${error.message}`,
      routeLabels: {},
    });
  }
});

/* ─────────────────── SIMULATION ENDPOINT ─────────────────── */

app.post('/api/simulate', async (req, res) => {
  try {
    const { intervention, currentAQI, lat, lon } = req.body;
    if (!intervention || !currentAQI || !lat || !lon)
      return res.status(400).json({ success: false, error: 'Missing required fields' });

    const currentAQINum = Number(currentAQI);
    const reductionFactor = 0.15 + Math.random() * 0.25;
    const newAQI = Math.round(currentAQINum * (1 - reductionFactor));
    const reductionAmount = Number((currentAQINum - newAQI).toFixed(2));
    const credits = Math.round(reductionAmount * 50);

    const dailyAQIHistory = Array.from({ length: 30 }, () =>
      Math.round(currentAQINum - 10 + Math.random() * 20));
    const trafficHistory = Array.from({ length: 30 }, () =>
      Math.round(30 + Math.random() * 40));

    res.json({
      success: true, newAQI, reductionAmount, credits,
      estimatedCost: 15000 + Math.random() * 50000,
      estimatedDays: 15 + Math.floor(Math.random() * 20),
      dailyAQIHistory, trafficHistory,
      aiInsight: {
        headline: `Impact Analysis of ${intervention}`,
        content: `The deployment of ${intervention} at this block is projected to significantly lower local particle concentrations. Real-time sensor data suggests a stable improvement curve over the next 15–30 days.`,
        tech_specs: 'V2.1 Deployment — Standard Bio-Filter',
        recommendation: 'Recommended placement for maximum efficiency is near high-traffic bottlenecks.',
      },
    });
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ success: false, error: 'Simulation failed' });
  }
});

/* ─────────────────── SERVER ─────────────────── */

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌍 Pollution-Aware Route Planner — Backend`);
  console.log(`🚀 Listening on http://localhost:${PORT}`);
  console.log(`📡 Adaptive sampling: 6–40 points | OSRM timeout: ${OSRM_TIMEOUT / 1000}s\n`);
});

server.timeout = 120000;