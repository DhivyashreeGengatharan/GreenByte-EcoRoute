import toast from 'react-hot-toast';
import React, { useState } from "react";
import { LeafletMap } from "./LeafletMap";
import { Sidebar } from "./Sidebar";
import { AnalyticsView } from "./AnalyticsView";
import { calculateRoute, type RouteResponse } from "../api/routing";
import { runSimulation, type SimulationResult } from "../api/simulate";
import { Navbar } from "./Navbar";
import { DashboardPanel } from "./DashboardPanel";
import { type Location } from "./LocationSearchInput";
import { reverseGeocode } from "../api/geocode";
import { ShieldCheckIcon } from "./ui/Icons";
import { DigitalTwin3D } from "./3d/DigitalTwin3D";
import { syncLiveApp } from "../utils/syncApp";
import "./DashboardPage.css";

interface DashboardPageProps {
  onOpenAuth?: (callback?: () => void) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenAuth }) => {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<string | null>("Green Wall");
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const handleLocateMe = async (lat: number, lon: number) => {
    setOrigin({ name: "Locating...", lat, lon });
    try {
      const englishAddress = await reverseGeocode(lat, lon);
      setOrigin({ name: englishAddress || `My Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`, lat, lon });
    } catch {
      setOrigin({ name: `My Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`, lat, lon });
    }
  };

  const handleCalculateRoute = async () => {
    if (!origin || !destination) {
      alert("Please select both origin and destination");
      return;
    }
    setLoading(true);
    setRouteError(null);
    try {
      const data = await calculateRoute(
        { lat: origin.lat, lon: origin.lon },
        { lat: destination.lat, lon: destination.lon }
      );
      setRouteData(data);
      setRouteError(null);
      // Close mobile planner to reveal map and route
      setMobileSidebarOpen(false);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "No road route available";
      setRouteError(errMsg);
      setRouteData(null);
      toast.error(errMsg, { duration: 6000, icon: '🌊' });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    const targetIntervention = selectedIntervention || "Green Wall";
    const targetLat = origin?.lat || 28.6139;
    const targetLon = origin?.lon || 77.2090;
    setLoading(true);
    try {
      const result = await runSimulation({
        blockId: 1,
        intervention: targetIntervention,
        currentAQI: 85,
        lat: targetLat,
        lon: targetLon,
        buildingDensity: "high",
        areaType: "urban",
        treeDensity: "low",
        treeCount: 5,
        traffic: "heavy"
      });
      setSimulationResult(result);
      setShowAnalytics(true);
      setViewMode('3d');
    } catch (err) {
      console.error(err);
      alert("Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "#030712" }}>
      <Navbar onOpenAuth={onOpenAuth} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Mobile Backdrop */}
        {(mobileSidebarOpen || mobilePanelOpen) && (
          <div 
            className="cockpit-drawer-backdrop" 
            onClick={() => {
              setMobileSidebarOpen(false);
              setMobilePanelOpen(false);
            }}
          />
        )}

        <Sidebar
          onLocateMe={handleLocateMe}
          onSelectIntervention={(val) => {
            setSelectedIntervention(val);
            if (val) setViewMode('3d');
          }}
          onSimulate={handleSimulate}
          selectedIntervention={selectedIntervention}
          onSetOrigin={setOrigin}
          onSetDestination={setDestination}
          onCalculateRoute={handleCalculateRoute}
          origin={origin}
          destination={destination}
          loading={loading}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          routeError={routeError}
        />

        <main className="cockpit-map-viewport" style={{ flex: 1, position: "relative", height: "100%" }}>
          {/* Spatial Telemetry HUD Chips (Top Left) — Non-Overlapping & Compact */}
          <div className="cockpit-hud-top">
            {/* View Mode Switcher: 2D GIS Map vs 3D Urban Digital Twin */}
            <div className="cockpit-hud-chip viewmode-chip">
              <button
                type="button"
                onClick={() => setViewMode('2d')}
                className={`viewmode-toggle-btn ${viewMode === '2d' ? 'active-2d' : ''}`}
                title="2D Planetary Navigation GIS Map"
              >
                <span>🗺️</span>
                <span>2D Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`viewmode-toggle-btn ${viewMode === '3d' ? 'active-3d' : ''}`}
                title="3D Urban Climate Digital Twin"
              >
                <span>🏙️</span>
                <span>3D Twin</span>
              </button>
            </div>

            <div className="cockpit-hud-chip telemetry-chip" title="Live OSRM & Open-Meteo Sensor Grid Active">
              <span className="cockpit-hud-chip-dot" />
              <span>Live Grid</span>
            </div>

            {routeData && (
              <div className="cockpit-hud-chip corridors-chip" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <ShieldCheckIcon size={13} color="#10b981" />
                <span>{routeData.routes.length} Corridors</span>
              </div>
            )}
          </div>

          {viewMode === '2d' ? (
            <LeafletMap
              origin={origin}
              destination={destination}
              setOrigin={setOrigin}
              setDestination={setDestination}
              routeData={routeData}
              loading={loading}
            />
          ) : (
            <div style={{ width: "100%", height: "100%" }}>
              <DigitalTwin3D
                initialIntervention={selectedIntervention ? (selectedIntervention.toLowerCase().includes('wall') ? 'green-wall' : selectedIntervention.toLowerCase().includes('algae') ? 'algae-panel' : selectedIntervention.toLowerCase().includes('air') || selectedIntervention.toLowerCase().includes('dac') ? 'direct-air-capture' : 'cool-roof') : 'green-wall'}
                onInterventionChange={(id) => {
                  const mapName: Record<string, string> = {
                    'green-wall': 'Green Wall',
                    'direct-air-capture': 'Direct Air Capture',
                    'algae-panel': 'Algae Panel',
                    'cool-roof': 'Cool Roof + Solar'
                  };
                  setSelectedIntervention(mapName[id] || 'Green Wall');
                }}
              />
            </div>
          )}

          {showAnalytics && simulationResult && (
            <AnalyticsView
              initialAQI={85}
              newAQI={simulationResult.newAQI}
              reductionAmount={simulationResult.reductionAmount}
              intervention={selectedIntervention || "green-wall"}
              estimatedCost={simulationResult.estimatedCost}
              traffic="heavy"
              buildingDensity="high"
              result={simulationResult}
              onClose={() => setShowAnalytics(false)}
            />
          )}

          {/* Mobile Bottom Dock — Zero-Collision Responsive Control */}
          <div className="cockpit-mobile-dock">
            <button
              type="button"
              className={`cockpit-mobile-dock-btn ${!mobileSidebarOpen && !mobilePanelOpen ? 'active' : ''}`}
              onClick={() => {
                setMobileSidebarOpen(false);
                setMobilePanelOpen(false);
              }}
              title="View Navigation Map"
            >
              <span>🗺️</span>
              <span>Map</span>
            </button>

            <button
              type="button"
              className={`cockpit-mobile-dock-btn ${mobileSidebarOpen ? 'active' : ''}`}
              onClick={() => {
                setMobileSidebarOpen(!mobileSidebarOpen);
                setMobilePanelOpen(false);
              }}
              title="Open Route Planner"
            >
              <span>📍</span>
              <span>Planner</span>
            </button>

            {routeData && (
              <button
                type="button"
                className={`cockpit-mobile-dock-btn ${mobilePanelOpen ? 'active' : ''}`}
                onClick={() => {
                  setMobilePanelOpen(!mobilePanelOpen);
                  setMobileSidebarOpen(false);
                }}
                title="View Corridors Comparison & Carbon Credits"
              >
                <span>📊</span>
                <span>Report</span>
              </button>
            )}

            <button
              type="button"
              className="cockpit-mobile-dock-btn sync-btn"
              onClick={syncLiveApp}
              title="Sync latest live updates from cloud"
            >
              <span>🔄</span>
              <span>Sync</span>
            </button>
          </div>
        </main>

        {/* Right Comparative Environmental Ledger Panel */}
        <DashboardPanel 
          routeData={routeData} 
          loading={loading}
          onOpenAuth={onOpenAuth}
          mobileOpen={mobilePanelOpen}
          onCloseMobile={() => setMobilePanelOpen(false)}
          routeError={routeError}
          onCarbonStored={() => {
            console.log('Carbon credits stored successfully');
          }}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
