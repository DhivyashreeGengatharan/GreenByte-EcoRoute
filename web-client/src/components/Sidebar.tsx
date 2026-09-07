import React, { useState } from "react";
import LocationSearchInput, { type Location } from "./LocationSearchInput";
import { LocateIcon, ArrowUpDownIcon, RouteIcon, LeafIcon, SlidersIcon } from "./ui/Icons";
import Button from "./ui/Button";

interface Props {
  onLocateMe: (lat: number, lon: number) => void;
  onSelectIntervention: (value: string | null) => void;
  onSimulate: () => void;
  selectedIntervention: string | null;
  selectedBlockCount?: number;
  onSetOrigin: (location: Location | null) => void;
  onSetDestination: (location: Location | null) => void;
  onCalculateRoute: () => void;
  origin: Location | null;
  destination: Location | null;
  loading: boolean;
  mobileOpen?: boolean;
}

const interventions = [
  {
    id: "green-wall",
    name: "Green Wall",
    emoji: "🌿",
    description: "Vertical bio-canopy reducing microclimate heat",
    cost: 12000,
    rate: "₹40 / sq.ft"
  },
  {
    id: "algae-panel",
    name: "Algae Panel",
    emoji: "🧪",
    description: "Bio-reactive air purification & carbon sink",
    cost: 25000,
    rate: "₹85 / sq.ft"
  },
  {
    id: "direct-air-capture",
    name: "Direct Air Capture",
    emoji: "🏭",
    description: "Industrial particulate & carbon capture array",
    cost: 80000,
    rate: "₹40,000 / unit"
  },
  {
    id: "retrofit",
    name: "Building Retrofit",
    emoji: "🏗️",
    description: "Thermal insulation & reflective facade upgrades",
    cost: 45000,
    rate: "₹15 / sq.ft"
  },
  {
    id: "biochar",
    name: "Biochar",
    emoji: "🪨",
    description: "Soil carbon sequestration & roadside runoff filter",
    cost: 8000,
    rate: "₹2 / sq.ft"
  },
  {
    id: "cool-roof",
    name: "Cool Roof + Solar",
    emoji: "☀️",
    description: "High-albedo reflective roof & distributed solar",
    cost: 35000,
    rate: "₹12 / sq.ft"
  }
];

export const Sidebar: React.FC<Props> = ({
  onLocateMe,
  onSelectIntervention,
  onSimulate,
  selectedIntervention,
  onSetOrigin,
  onSetDestination,
  onCalculateRoute,
  origin,
  destination,
  loading,
  mobileOpen = false,
}) => {
  const [activeTab, setActiveTab] = useState<'routing' | 'interventions'>('routing');
  const [locating, setLocating] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocateMe(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      (error) => {
        console.error("Locate error:", error);
        alert("Unable to retrieve current location. Please check browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSwapLocations = () => {
    const tempOrigin = origin;
    onSetOrigin(destination);
    onSetDestination(tempOrigin);
  };

  const canCalculate = Boolean(origin && destination && !loading);

  return (
    <aside className={`sidebar-container ${mobileOpen ? 'mobile-open' : ''}`} style={{
      width: "350px",
      height: "100%",
      background: "rgba(11, 17, 32, 0.96)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRight: "1px solid rgba(0, 240, 255, 0.14)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      zIndex: 600,
      overflow: "hidden",
      boxShadow: "4px 0 30px rgba(0, 0, 0, 0.6)"
    }}>
      {/* Sidebar Segmented Mode Switcher */}
      <div style={{
        padding: "16px 20px 0 20px",
        borderBottom: "1px solid rgba(0, 240, 255, 0.12)",
        background: "rgba(3, 7, 18, 0.6)"
      }}>
        <div style={{
          display: "flex",
          gap: "6px",
          background: "rgba(3, 7, 18, 0.85)",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: "14px"
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "7px",
              border: activeTab === 'routing' ? "1px solid rgba(0, 255, 157, 0.4)" : "1px solid transparent",
              fontSize: "12.5px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: activeTab === 'routing' ? "rgba(0, 255, 157, 0.15)" : "transparent",
              color: activeTab === 'routing' ? "#00ff9d" : "#94a3b8",
              boxShadow: activeTab === 'routing' ? "0 0 12px rgba(0, 255, 157, 0.25)" : "none"
            }}
          >
            <RouteIcon size={14} color={activeTab === 'routing' ? "#00ff9d" : "currentColor"} />
            <span>Corridor Planner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interventions')}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "7px",
              border: activeTab === 'interventions' ? "1px solid rgba(0, 240, 255, 0.4)" : "1px solid transparent",
              fontSize: "12.5px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: activeTab === 'interventions' ? "rgba(0, 240, 255, 0.15)" : "transparent",
              color: activeTab === 'interventions' ? "#00f0ff" : "#94a3b8",
              boxShadow: activeTab === 'interventions' ? "0 0 12px rgba(0, 240, 255, 0.25)" : "none"
            }}
          >
            <SlidersIcon size={14} color={activeTab === 'interventions' ? "#00f0ff" : "currentColor"} />
            <span>Digital Twin</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        padding: "20px", 
        display: "flex", 
        flexDirection: "column", 
        gap: "20px", 
        overflowY: "auto", 
        flex: 1 
      }}>
        {activeTab === 'routing' ? (
          <>
            {/* Corridor Planning Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.01em" }}>
                  Navigation Route
                </h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                  Search or click on map for A & B
                </p>
              </div>

              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(0, 255, 157, 0.3)",
                  background: "rgba(0, 255, 157, 0.08)",
                  color: "#00ff9d",
                  cursor: locating ? "wait" : "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                  transition: "all 0.15s ease"
                }}
                title="Use current GPS location"
              >
                <LocateIcon size={14} color="#00ff9d" />
                <span>{locating ? "Locating..." : "My Location"}</span>
              </button>
            </div>

            {/* Origin & Destination Inputs with Connector & Swap */}
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Origin Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#00ff9d", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff9d", display: "inline-block", boxShadow: "0 0 6px #00ff9d" }} />
                    Origin (Point A)
                  </label>
                  {origin && (
                    <span style={{ fontSize: "10px", color: "#00f0ff", fontFamily: "var(--font-mono, monospace)" }}>
                      {origin.lat.toFixed(4)}, {origin.lon.toFixed(4)}
                    </span>
                  )}
                </div>
                <LocationSearchInput
                  placeholder="Search starting location..."
                  onSelect={onSetOrigin}
                  initialValue={origin?.name || ""}
                  icon={<span style={{ fontWeight: "800", color: "#00ff9d", fontSize: "13px" }}>A</span>}
                />
              </div>

              {/* Swap Button Divider */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", margin: "-4px 0" }}>
                <div style={{ height: "1px", background: "rgba(0, 240, 255, 0.15)", width: "100%" }} />
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  disabled={!origin && !destination}
                  style={{
                    position: "absolute",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#0f172a",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                    boxShadow: "0 0 12px rgba(0, 240, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: (!origin && !destination) ? "not-allowed" : "pointer",
                    color: "#00f0ff",
                    transition: "transform 0.15s ease, border-color 0.15s ease"
                  }}
                  title="Swap Origin and Destination"
                >
                  <ArrowUpDownIcon size={14} />
                </button>
              </div>

              {/* Destination Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#00f0ff", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00f0ff", display: "inline-block", boxShadow: "0 0 6px #00f0ff" }} />
                    Destination (Point B)
                  </label>
                  {destination && (
                    <span style={{ fontSize: "10px", color: "#00f0ff", fontFamily: "var(--font-mono, monospace)" }}>
                      {destination.lat.toFixed(4)}, {destination.lon.toFixed(4)}
                    </span>
                  )}
                </div>
                <LocationSearchInput
                  placeholder="Search destination..."
                  onSelect={onSetDestination}
                  initialValue={destination?.name || ""}
                  icon={<span style={{ fontWeight: "800", color: "#00f0ff", fontSize: "13px" }}>B</span>}
                />
              </div>

              {/* Calculate CTA Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={onCalculateRoute}
                disabled={!canCalculate}
                loading={loading}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #00ff9d 0%, #00f0ff 100%)",
                  color: "#030712",
                  fontWeight: "800",
                  boxShadow: "0 0 20px rgba(0, 255, 157, 0.35)",
                  border: "none"
                }}
              >
                {loading ? "Calculating Multi-Factor Corridors..." : "Calculate Green Route"}
              </Button>
            </div>

            {/* Quick Tips */}
            <div style={{
              padding: "12px 14px",
              background: "rgba(15, 23, 42, 0.8)",
              borderRadius: "10px",
              border: "1px solid rgba(0, 255, 157, 0.25)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px"
            }}>
              <span style={{ marginTop: "2px", flexShrink: 0, display: "inline-flex" }}>
                <LeafIcon size={16} color="#00ff9d" />
              </span>
              <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.4 }}>
                <strong style={{ color: "#00ff9d" }}>Pollution-Aware Routing:</strong> EcoRoute evaluates AQI exposure, road canopy density, and traffic to protect respiratory health.
              </div>
            </div>
          </>
        ) : (
          /* Interventions Tab */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                Digital Twin Interventions
              </h2>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                Select urban intervention to simulate AQI reduction
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {interventions.map((item) => {
                const isSelected = selectedIntervention === item.name;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onSelectIntervention(item.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #00ff9d" : "1px solid rgba(255, 255, 255, 0.08)",
                      backgroundColor: isSelected ? "rgba(0, 255, 157, 0.12)" : "rgba(15, 23, 42, 0.8)",
                      boxShadow: isSelected ? "0 0 16px rgba(0, 255, 157, 0.25)" : "none",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>{item.emoji}</span>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: "700", color: isSelected ? "#00ff9d" : "#f8fafc" }}>{item.name}</span>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#00f0ff" }}>{item.rate}</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px", lineHeight: 1.3 }}>
                        {item.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Persistent Bottom Action when in interventions tab */}
      {activeTab === 'interventions' && (
        <div style={{ 
          padding: "16px 20px", 
          borderTop: "1px solid rgba(0, 240, 255, 0.14)", 
          background: "rgba(11, 17, 32, 0.95)" 
        }}>
          <Button
            variant="primary"
            size="lg"
            onClick={onSimulate}
            disabled={!selectedIntervention || loading}
            loading={loading}
            style={{ 
              width: "100%", 
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00f0ff 0%, #00ff9d 100%)",
              color: "#030712",
              fontWeight: "800",
              boxShadow: "0 0 20px rgba(0, 240, 255, 0.35)",
              border: "none"
            }}
          >
            {loading ? "Simulating Impact..." : "Run Digital Twin Simulation"}
          </Button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;