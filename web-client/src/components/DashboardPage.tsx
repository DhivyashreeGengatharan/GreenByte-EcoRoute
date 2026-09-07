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
import { SlidersIcon, ShieldCheckIcon } from "./ui/Icons";
import { DigitalTwin3D } from "./3d/DigitalTwin3D";
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
    try {
      const data = await calculateRoute(
        { lat: origin.lat, lon: origin.lon },
        { lat: destination.lat, lon: destination.lon }
      );
      setRouteData(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to find route. Try nearby locations.");
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

  const handleToggleSimulator = () => {
    if (!showAnalytics && !simulationResult) {
      handleSimulate();
    } else {
      setShowAnalytics(!showAnalytics);
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
        />

        <main className="cockpit-map-viewport" style={{ flex: 1, position: "relative", height: "100%" }}>
          {/* Spatial Telemetry HUD Chips */}
          <div className="cockpit-hud-top">
            {/* View Mode Switcher: 2D GIS Map vs 3D Urban Digital Twin */}
            <div 
              className="cockpit-hud-chip"
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(3, 7, 18, 0.85)",
                padding: "3px",
                borderRadius: "10px",
                border: "1px solid rgba(0, 240, 255, 0.3)",
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                zIndex: 600
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('2d')}
                style={{
                  padding: "5px 12px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  backgroundColor: viewMode === '2d' ? "rgba(0, 240, 255, 0.25)" : "transparent",
                  color: viewMode === '2d' ? "#00f0ff" : "#94a3b8",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: viewMode === '2d' ? "rgba(0, 240, 255, 0.6)" : "transparent",
                  transition: "all 0.15s ease"
                }}
              >
                🗺️ 2D Navigation GIS
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                style={{
                  padding: "5px 12px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  backgroundColor: viewMode === '3d' ? "rgba(0, 255, 157, 0.25)" : "transparent",
                  color: viewMode === '3d' ? "#00ff9d" : "#94a3b8",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: viewMode === '3d' ? "rgba(0, 255, 157, 0.6)" : "transparent",
                  transition: "all 0.15s ease"
                }}
              >
                🏙️ 3D Digital Twin City
              </button>
            </div>

            <div className="cockpit-hud-chip">
              <span className="cockpit-hud-chip-dot" />
              <span className="cockpit-hud-chip-label">Telemetry:</span>
              <span>Live Sensor Grid</span>
            </div>

            {routeData && (
              <div className="cockpit-hud-chip" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <ShieldCheckIcon size={14} color="#10b981" />
                <span>{routeData.routes.length} Corridors</span>
              </div>
            )}

            <button 
              type="button" 
              className="cockpit-hud-chip clickable"
              onClick={handleToggleSimulator}
              title="Toggle Digital Twin Simulation Lab"
            >
              <SlidersIcon size={14} color="#38bdf8" />
              <span>{showAnalytics ? "Close Lab" : "Digital Twin Lab"}</span>
            </button>
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

          {/* Mobile Bottom Dock */}
          <div className="cockpit-mobile-dock">
            <button
              type="button"
              className={`cockpit-mobile-dock-btn ${mobileSidebarOpen ? 'active' : ''}`}
              onClick={() => {
                setMobileSidebarOpen(!mobileSidebarOpen);
                setMobilePanelOpen(false);
              }}
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
              >
                <span>📊</span>
                <span>Report</span>
              </button>
            )}
          </div>
        </main>

        {/* Right Comparative Environmental Ledger Panel */}
        <DashboardPanel 
          routeData={routeData} 
          loading={loading}
          onOpenAuth={onOpenAuth}
          mobileOpen={mobilePanelOpen}
          onCarbonStored={() => {
            console.log('Carbon credits stored successfully');
          }}
        />
      </div>
    </div>
  );
};

export default DashboardPage;