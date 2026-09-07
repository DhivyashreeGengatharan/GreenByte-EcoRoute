import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { type RouteResponse } from "../api/routing";
import { type Location } from "./LocationSearchInput";
import { reverseGeocode } from "../api/geocode";
import "./LeafletMap.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ─────────────────── PREMIUM SVG DIVICONS ─────────────────── */

const createOriginIcon = () => {
  return L.divIcon({
    className: 'origin-marker-wrapper',
    html: `
      <div style="position: relative; width: 34px; height: 42px; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          font-weight: 800;
          font-size: 14px;
          animation: markerPulseGlow 2.5s infinite;
        ">A</div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid #10b981;
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36]
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    className: 'destination-marker-wrapper',
    html: `
      <div style="position: relative; width: 34px; height: 42px; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          font-weight: 800;
          font-size: 14px;
        ">B</div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid #6366f1;
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36]
  });
};

const createHotspotIcon = () => {
  return L.divIcon({
    className: 'hotspot-marker-wrapper',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          animation: hotspotPulseGlow 1.8s infinite;
        ">🔥</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

/** Creates a pulsing vehicle icon for simulation */
const createVehicleIcon = (color: string, emoji: string) => {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${color}33;
          animation: vehicleRadarPulse 1.4s cubic-bezier(0.2, 0, 0.4, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 14px ${color}99;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          z-index: 10;
        ">${emoji}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

/* ─────────────────── SIMULATION ENGINE ─────────────────── */

function lerpLatLng(
  a: [number, number],
  b: [number, number],
  t: number
): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function buildDensePoints(
  path: [number, number][],
  totalSteps: number
): [number, number][] {
  if (path.length < 2) return path;

  const cumDist: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const [la1, lo1] = path[i - 1];
    const [la2, lo2] = path[i];
    const d = Math.sqrt((la2 - la1) ** 2 + (lo2 - lo1) ** 2);
    cumDist.push(cumDist[i - 1] + d);
  }
  const totalDist = cumDist[cumDist.length - 1];

  const dense: [number, number][] = [];
  for (let step = 0; step <= totalSteps; step++) {
    const target = (step / totalSteps) * totalDist;
    let lo = 0, hi = path.length - 2;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (cumDist[mid + 1] < target) lo = mid + 1;
      else hi = mid;
    }
    const segStart = cumDist[lo];
    const segEnd = cumDist[lo + 1];
    const t = segEnd === segStart ? 0 : (target - segStart) / (segEnd - segStart);
    dense.push(lerpLatLng(path[lo], path[lo + 1], t));
  }
  return dense;
}

const SIMULATION_STEPS = 1200;
const getSimulationDuration = (km: number) => Math.max(9000, Math.min(15000, 9000 + km * 1000));

interface SimulationControllerProps {
  routeData: RouteResponse;
  onStart: () => void;
  onComplete: () => void;
  shouldRun: boolean;
}

const SimulationController: React.FC<SimulationControllerProps> = ({
  routeData,
  onStart,
  onComplete,
  shouldRun,
}) => {
  const map = useMap();
  const rafRef = useRef<number | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const startTimeRef = useRef<number | null>(null);
  const [densePaths, setDensePaths] = useState<Record<string, [number, number][]> | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    startTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (shouldRun && routeData?.routes) {
      const pathsMap: Record<string, [number, number][]> = {};
      const toPairs = (p: any[]): [number, number][] => 
        p.map(pt => Array.isArray(pt) ? [pt[0], pt[1]] : [pt.lat, pt.lng || pt.lon]);

      routeData.routes.forEach(route => {
        if (route.path) {
          pathsMap[route.id] = buildDensePoints(toPairs(route.path), SIMULATION_STEPS);
        }
      });
      setDensePaths(pathsMap);
    } else {
      setDensePaths(null);
      cleanup();
    }
  }, [shouldRun, routeData, cleanup]);

  useEffect(() => {
    if (!shouldRun || !densePaths || !routeData.routes) return;

    routeData.routes.forEach((route, i) => {
      if (!densePaths[route.id]) return;
      
      const isEco = route.id === routeData.ecoRouteId;
      const isShortest = route.id === routeData.shortestRouteId;
      
      let color = ALT_COLORS[i % ALT_COLORS.length];
      let emoji = '🚗';

      if (isEco) {
        color = "#10b981";
        emoji = '🌿';
      } else if (isShortest) {
        color = "#6366f1";
        emoji = '⚡'; 
      }

      const icon = createVehicleIcon(color, emoji);
      markersRef.current[route.id] = L.marker(densePaths[route.id][0], { 
        icon, 
        zIndexOffset: 2000 + (isEco ? 100 : 0) 
      }).addTo(map);
    });

    const allCoords: [number, number][] = [];
    routeData.routes.forEach(r => {
      const p = r.path || [];
      p.forEach((pt: any) => {
        if (Array.isArray(pt)) allCoords.push([pt[0], pt[1]]);
        else allCoords.push([pt.lat, pt.lng || pt.lon]);
      });
    });
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [80, 80], maxZoom: 14 });
    }

    onStart();

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      
      const maxDistance = Math.max(...routeData.routes.map(r => r.summary.distanceKm));
      const duration = getSimulationDuration(maxDistance);
      const progress = Math.min(elapsed / duration, 1);

      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const stepIdx = Math.min(Math.floor(eased * SIMULATION_STEPS), SIMULATION_STEPS);

      routeData.routes.forEach(route => {
        const marker = markersRef.current[route.id];
        const path = densePaths[route.id];
        if (marker && path && path[stepIdx]) {
          marker.setLatLng(path[stepIdx]);
        }
      });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        routeData.routes.forEach(route => {
          const marker = markersRef.current[route.id];
          const path = densePaths[route.id];
          if (marker && path) {
            marker.setLatLng(path[SIMULATION_STEPS]);
          }
        });
        setTimeout(() => {
          cleanup();
          onComplete();
        }, 1000);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cleanup();
  }, [densePaths, shouldRun, map, onStart, onComplete, routeData, cleanup]);

  return null;
};

/* ─────────────────── MAP UTILITY COMPONENTS ─────────────────── */

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

const MapFitBounds: React.FC<{ origin: Location | null; destination: Location | null; routeData: RouteResponse | null }> = ({ origin, destination, routeData }) => {
  const map = useMap();

  useEffect(() => {
    if (routeData) {
      const mainRoute = routeData.routes?.find(r => r.id === routeData.ecoRouteId) || routeData.routes?.[0];
      if (mainRoute?.path?.length) {
        const toPairs = (p: any[]): [number, number][] => p.map(pt => Array.isArray(pt) ? [pt[0], pt[1]] : [pt.lat, pt.lng || pt.lon]);
        const bounds = L.latLngBounds(toPairs(mainRoute.path));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    } else if (origin && destination) {
      const bounds = L.latLngBounds([
        [origin.lat, origin.lon],
        [destination.lat, destination.lon]
      ]);
      map.fitBounds(bounds, { padding: [80, 80] });
    } else if (origin) {
      map.setView([origin.lat, origin.lon], 13, { animate: true });
    } else if (destination) {
      map.setView([destination.lat, destination.lon], 13, { animate: true });
    }
  }, [origin, destination, routeData, map]);

  return null;
};

const ALT_COLORS = ["#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];

const RouteLegend: React.FC<{ routeData: RouteResponse; isSimulating: boolean }> = ({ routeData, isSimulating }) => {
  const routes = routeData.routes || [];
  
  const items = routes.map((route, i) => {
    const isEco = route.id === routeData.ecoRouteId;
    const isShortest = route.id === routeData.shortestRouteId;
    
    let label = "Alternative Corridor";
    let color = ALT_COLORS[i % ALT_COLORS.length];
    let simLabel = "🚗 Standard Fleet";

    if (isEco) {
      label = "Recommended Eco Route";
      color = "#10b981";
      simLabel = "🌿 Eco Vehicle (Clean Corridor)";
    } else if (isShortest) {
      label = "Direct Shortest Distance";
      color = "#6366f1";
      simLabel = "⚡ Highway Shortest";
    }

    return {
      color,
      label,
      distance: `${route.summary.distanceKm.toFixed(1)} km`,
      duration: `${route.summary.durationMin} min`,
      simLabel
    };
  });

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '20px',
      zIndex: 500,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.12)',
      minWidth: '240px',
      color: '#ffffff'
    }}>
      <div style={{
        fontSize: '11px', 
        fontWeight: '700', 
        color: '#94a3b8',
        marginBottom: '10px', 
        textTransform: 'uppercase', 
        letterSpacing: '0.06em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{isSimulating ? 'Corridor Simulation' : 'Active Corridors'}</span>
        <span style={{ fontSize: '10px', color: '#10b981' }}>{routes.length} Available</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: i < items.length - 1 ? '8px' : 0,
          padding: '4px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: item.color,
              display: 'inline-block',
              boxShadow: `0 0 8px ${item.color}88`
            }} />
            <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#f8fafc' }}>
              {isSimulating ? item.simLabel : item.label}
            </div>
          </div>
          {!isSimulating && (
            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>
              {item.distance}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const MapClickHandler: React.FC<{ onClick: (latlng: [number, number]) => void }> = ({ onClick }) => {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const SimulationButton: React.FC<{
  isSimulating: boolean;
  disabled: boolean;
  onRun: () => void;
}> = ({ isSimulating, disabled, onRun }) => (
  <button
    type="button"
    onClick={onRun}
    disabled={disabled}
    style={{
      position: 'absolute',
      bottom: '24px',
      right: '20px',
      zIndex: 500,
      padding: '11px 20px',
      background: disabled && !isSimulating
        ? 'rgba(30, 41, 59, 0.7)'
        : isSimulating
          ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
          : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      fontWeight: '700',
      fontSize: '13px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: isSimulating
        ? '0 6px 20px rgba(249, 115, 22, 0.4)'
        : '0 6px 20px rgba(16, 185, 129, 0.35)',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backdropFilter: 'blur(12px)',
      opacity: disabled && !isSimulating ? 0.6 : 1
    }}
  >
    <span style={{ fontSize: '15px' }}>{isSimulating ? '⏳' : '▶️'}</span>
    <span>{isSimulating ? 'Simulating Corridor Fleet...' : 'Simulate Fleet Travel'}</span>
  </button>
);

interface GreenPathMapProps {
  origin: Location | null;
  destination: Location | null;
  setOrigin: (val: Location | null) => void;
  setDestination: (val: Location | null) => void;
  routeData: RouteResponse | null;
  loading: boolean;
}

export const LeafletMap: React.FC<GreenPathMapProps> = ({
  origin,
  destination,
  setOrigin,
  setDestination,
  routeData,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [shouldRunSim, setShouldRunSim] = useState(false);

  useEffect(() => {
    setShouldRunSim(false);
    setIsSimulating(false);
  }, [routeData]);

  const handleRunSim = () => {
    if (!routeData || isSimulating) return;
    setShouldRunSim(true);
  };

  const handleSimStart = () => {
    setIsSimulating(true);
  };

  const handleSimComplete = () => {
    setIsSimulating(false);
    setShouldRunSim(false);
  };

  const handleMapClick = async (latlng: [number, number]) => {
    const lat = latlng[0];
    const lon = latlng[1];
    const fallbackName = `Selected (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    const loc: Location = { 
      name: fallbackName, 
      lat, 
      lon 
    };

    if (!origin) {
      setOrigin(loc);
      setDestination(null);
      try {
        const englishAddress = await reverseGeocode(lat, lon);
        if (englishAddress) {
          setOrigin({ name: englishAddress, lat, lon });
        }
      } catch (err) {
        console.warn("[MapClick] Reverse geocoding failed:", err);
      }
    } else if (!destination) {
      setDestination(loc);
      try {
        const englishAddress = await reverseGeocode(lat, lon);
        if (englishAddress) {
          setDestination({ name: englishAddress, lat, lon });
        }
      } catch (err) {
        console.warn("[MapClick] Reverse geocoding failed:", err);
      }
    } else {
      setOrigin(loc);
      setDestination(null);
      try {
        const englishAddress = await reverseGeocode(lat, lon);
        if (englishAddress) {
          setOrigin({ name: englishAddress, lat, lon });
        }
      } catch (err) {
        console.warn("[MapClick] Reverse geocoding failed:", err);
      }
    }
  };

  const routesToRender = routeData?.routes || [];
  
  const renderOrder = [...routesToRender].sort((a, b) => {
    const rank = (r: typeof a) => {
      if (r.id === routeData?.ecoRouteId) return 2;
      if (r.id === routeData?.shortestRouteId) return 1;
      return 0;
    };
    return rank(a) - rank(b);
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        center={BENGALURU_CENTER}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom'
          maxZoom={16}
        />
        <MapFitBounds origin={origin} destination={destination} routeData={routeData} />
        <MapClickHandler onClick={handleMapClick} />

        {origin && <Marker position={[origin.lat, origin.lon]} icon={createOriginIcon()} />}
        {destination && <Marker position={[destination.lat, destination.lon]} icon={createDestinationIcon()} />}

        {renderOrder.map((route) => {
          try {
            const pathArray = (route.path || []) as any[];
            let coords: [number, number][] = pathArray.map(p => {
              if (Array.isArray(p)) return [p[0] as number, p[1] as number];
              return [p.lat as number, (p.lng || p.lon) as number];
            });
            if (coords.length === 0) return null;

            const isEco = route.id === routeData?.ecoRouteId;
            const isShortest = route.id === routeData?.shortestRouteId;

            const baseRoute = routeData?.routes?.find(r => r.id === routeData.shortestRouteId);
            if (baseRoute && route.id !== baseRoute.id) {
              const distDiff = Math.abs(route.summary.distanceKm - baseRoute.summary.distanceKm);
              if (distDiff < 0.1) {
                const offset = 0.0003;
                coords = coords.map(([lat, lon]) => [lat + offset, lon + offset]);
              }
            }

            let color = ALT_COLORS[renderOrder.indexOf(route) % ALT_COLORS.length];
            let weight = 4;
            let opacity = 0.8;
            let dashArray: string | undefined = "6, 8";

            if (isEco) {
              color = "#10b981"; // Luminous Emerald
              weight = 6;
              opacity = 1.0;
              dashArray = undefined;
            } else if (isShortest) {
              color = "#6366f1"; // Indigo
              weight = 5;
              opacity = 0.9;
              dashArray = undefined;
            }

            const label = isEco ? "🌿 Eco Route (Recommended)" : (isShortest ? "⚡ Shortest Distance" : "⚪ Alternative Route");

            let reroutedCoords: [number, number][] = [];
            if (isEco && routeData?.optimizationTriggered && routeData?.hotspotLocation) {
              const hLat = routeData.hotspotLocation.lat;
              const hLon = (routeData.hotspotLocation as any).lng || (routeData.hotspotLocation as any).lon;
              let minIndex = 0, minDist = Infinity;
              coords.forEach((coord, idx) => {
                const d = Math.pow(coord[0] - hLat, 2) + Math.pow(coord[1] - hLon, 2);
                if (d < minDist) { minDist = d; minIndex = idx; }
              });
              const startIdx = Math.max(0, minIndex - 10);
              const endIdx = Math.min(coords.length - 1, minIndex + 10);
              reroutedCoords = coords.slice(startIdx, endIdx);
            }

            return (
              <React.Fragment key={route.id}>
                {/* Luminous Glow for Eco Route */}
                {isEco && (
                  <Polyline positions={coords} color="#10b981" weight={14} opacity={0.25} />
                )}
                <Polyline
                  positions={coords}
                  color={color}
                  weight={weight}
                  opacity={opacity}
                  dashArray={dashArray}
                >
                  <Popup>
                    <div style={{ padding: "4px", minWidth: "180px" }}>
                      <div style={{ 
                        fontWeight: "700", 
                        fontSize: "13px",
                        marginBottom: "6px", 
                        borderBottom: "1px solid rgba(255,255,255,0.15)", 
                        paddingBottom: "6px",
                        color: isEco ? "#34d399" : "#ffffff"
                      }}>
                        {label}
                      </div>
                      <div style={{ fontSize: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", color: "#cbd5e1" }}>
                        <span>📏 Distance:</span> <strong style={{ color: "#ffffff" }}>{route.summary.distanceKm.toFixed(1)} km</strong>
                        <span>⏱️ Duration:</span> <strong style={{ color: "#ffffff" }}>{route.summary.durationMin} min</strong>
                      </div>
                    </div>
                  </Popup>
                </Polyline>

                {/* Orange alert rerouted segment */}
                {reroutedCoords.length > 0 && (
                  <Polyline
                    positions={reroutedCoords}
                    color="#f59e0b"
                    weight={weight + 2}
                    opacity={0.9}
                    dashArray="8, 8"
                  />
                )}
              </React.Fragment>
            );
          } catch (error) {
            console.error('Error rendering route:', error, route);
            return null;
          }
        })}

        {/* Hotspot Marker */}
        {routeData?.hotspotLocation && (
          <Marker 
            position={[routeData.hotspotLocation.lat, (routeData.hotspotLocation as any).lng || (routeData.hotspotLocation as any).lon]} 
            icon={createHotspotIcon()}
          >
            <Popup>
              <div style={{ padding: "6px 4px", minWidth: "200px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "4px", 
                    fontSize: "11px", 
                    fontWeight: "800", 
                    background: "rgba(239, 68, 68, 0.15)", 
                    color: "#f87171",
                    padding: "3px 8px", 
                    borderRadius: "6px",
                    textTransform: "uppercase" 
                  }}>
                    🔥 Severe Hotspot
                  </span>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>Sensor Grid</span>
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>
                  Elevated Particulate Epicenter
                </div>
                <p style={{ margin: "0 0 8px 0", fontSize: "11.5px", color: "#cbd5e1", lineHeight: 1.4 }}>
                  Real-time sensor detected acute PM2.5 concentrations. EcoRoute algorithm executed an automated avoidance diversion around this zone.
                </p>
                <div style={{ 
                  padding: "6px 8px", 
                  background: "rgba(255, 255, 255, 0.05)", 
                  borderRadius: "6px", 
                  fontSize: "11px", 
                  color: "#34d399",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span>🛡️</span>
                  <span>Avoided ~60% toxic particulate inhalation</span>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Intervention Zones */}
        {routeData?.interventionZones?.map((zone, idx) => (
          <Marker
            key={`zone-${idx}`}
            position={[zone.lat, zone.lon]}
            icon={L.divIcon({
              className: 'intervention-marker',
              html: `
                <div style="
                  background-color: ${zone.type === 'high' ? '#ef4444' : '#f59e0b'};
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  border: 2.5px solid #ffffff;
                  box-shadow: 0 0 14px rgba(0,0,0,0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 13px;
                ">⚠️</div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
          >
            <Popup>
              <div style={{ padding: "6px 4px", minWidth: "190px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ 
                    fontSize: "11px", 
                    fontWeight: "800", 
                    color: zone.type === 'high' ? "#f87171" : "#fbbf24",
                    background: zone.type === 'high' ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    textTransform: "uppercase"
                  }}>
                    {zone.type === 'high' ? 'High Hazard Zone' : 'Moderate Hazard Zone'}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-mono, monospace)" }}>
                    AQI {zone.aqi}
                  </span>
                </div>
                <p style={{ margin: "0 0 6px 0", fontSize: "11.5px", color: "#cbd5e1" }}>
                  High urban heat & emission density corridor.
                </p>
                <div style={{ 
                  fontSize: "11px", 
                  color: "#38bdf8", 
                  background: "rgba(56, 189, 248, 0.1)", 
                  padding: "5px 8px", 
                  borderRadius: "6px" 
                }}>
                  🌱 Recommended: Vertical Green Wall / Algae Bio-Canopy
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Simulation Fleet */}
        {routeData && (
          <SimulationController
            routeData={routeData}
            shouldRun={shouldRunSim}
            onStart={handleSimStart}
            onComplete={handleSimComplete}
          />
        )}
      </MapContainer>

      {/* Corridor Legend */}
      {routeData && (
        <RouteLegend routeData={routeData} isSimulating={isSimulating} />
      )}

      {/* Simulation Trigger Button */}
      <SimulationButton
        isSimulating={isSimulating}
        disabled={!routeData || isSimulating}
        onRun={handleRunSim}
      />
    </div>
  );
};

export default LeafletMap;
