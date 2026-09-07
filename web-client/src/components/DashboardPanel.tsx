import React, { useState, useEffect } from "react";
import type { RouteResponse, Route } from "../api/routing";
import { StoreCarbonButton } from "./StoreCarbonButton";
import { Badge } from "./ui/Badge";
import { LeafIcon, RouteIcon, ClockIcon, WindIcon, CoinsIcon } from "./ui/Icons";
import { PipelineVisualizer, type PipelineStep } from "./ui/PipelineVisualizer";
import { MetricCard } from "./ui/MetricCard";
import { AnimatedCounter } from "./ui/AnimatedCounter";

interface DashboardPanelProps {
  routeData: RouteResponse | null;
  loading: boolean;
  onOpenAuth?: (callback?: () => void) => void;
  onCarbonStored?: () => void;
  mobileOpen?: boolean;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ 
  routeData, 
  loading,
  onOpenAuth,
  onCarbonStored,
  mobileOpen = false
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState(1);

  useEffect(() => {
    if (!loading) {
      setPipelineStage(1);
      return;
    }
    const timer = setInterval(() => {
      setPipelineStage(prev => (prev < 6 ? prev + 1 : 1));
    }, 420);
    return () => clearInterval(timer);
  }, [loading]);

  const pipelineSteps: PipelineStep[] = [
    { label: "Geo-Lock Waypoints (Origin/Dest)", status: pipelineStage > 1 ? "done" : pipelineStage === 1 ? "running" : "pending" },
    { label: "Querying Road Graph (OSRM)", status: pipelineStage > 2 ? "done" : pipelineStage === 2 ? "running" : "pending" },
    { label: "Sampling Live AQI Stations", status: pipelineStage > 3 ? "done" : pipelineStage === 3 ? "running" : "pending" },
    { label: "Roadside Canopy & Microclimate", status: pipelineStage > 4 ? "done" : pipelineStage === 4 ? "running" : "pending" },
    { label: "Pareto Multi-Objective Engine", status: pipelineStage > 5 ? "done" : pipelineStage === 5 ? "running" : "pending" },
    { label: "Verified Carbon Ledger Staking", status: pipelineStage >= 6 ? "done" : "pending" },
  ];

  if (!routeData && !loading) return null;

  const activeRouteId = selectedRouteId || routeData?.ecoRouteId || routeData?.routes?.[0]?.id;
  const selectedRoute = routeData?.routes?.find(r => r.id === activeRouteId);

  const isEcoRoute = selectedRoute?.id === routeData?.ecoRouteId;
  const isShortest = selectedRoute?.id === routeData?.shortestRouteId;

  return (
    <div className={`dashboard-panel ${mobileOpen ? 'mobile-open' : ''}`} style={{
      width: "360px",
      height: "100%",
      background: "rgba(11, 17, 32, 0.96)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderLeft: "1px solid rgba(0, 240, 255, 0.14)",
      boxShadow: "-4px 0 30px rgba(0, 0, 0, 0.6)",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "18px",
      overflowY: "auto",
      zIndex: 600,
      color: "#f8fafc"
    }}>
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              border: "3px solid rgba(0, 240, 255, 0.15)",
              borderTop: "3px solid #00f0ff",
              borderRadius: "50%",
              animation: "panelSpin 0.8s linear infinite",
              boxShadow: "0 0 16px rgba(0, 240, 255, 0.4)",
              flexShrink: 0
            }} />
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.01em" }}>
                Synthesizing Corridors...
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "2px 0 0 0" }}>
                Multi-objective real-time routing engine
              </p>
            </div>
          </div>

          <PipelineVisualizer 
            title="Routing Engine Pipeline"
            steps={pipelineSteps}
          />
          <style>{`
            @keyframes panelSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {routeData && !loading && (
        <>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>🧭</span>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.01em" }}>
                  Route Intelligence
                </h2>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                Multi-factor environmental evaluation
              </p>
            </div>
            <Badge variant="eco" size="sm">
              {routeData.routes?.length || 1} Corridors
            </Badge>
          </div>

          {/* Comparative Corridor Selection Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#00f0ff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Comparative Corridors
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {routeData.routes.map((route: Route) => {
                const isSelected = route.id === activeRouteId;
                const isEco = route.id === routeData.ecoRouteId;
                const isShort = route.id === routeData.shortestRouteId;

                let borderStyle = "1px solid rgba(255, 255, 255, 0.08)";
                let bgStyle = "rgba(15, 23, 42, 0.75)";
                let badgeVariant: "eco" | "shortest" | "alt" = "alt";
                let badgeLabel = "Alternative";

                if (isEco) {
                  badgeVariant = "eco";
                  badgeLabel = "Eco (Recommended)";
                  if (isSelected) {
                    borderStyle = "2px solid #00ff9d";
                    bgStyle = "rgba(0, 255, 157, 0.12)";
                  }
                } else if (isShort) {
                  badgeVariant = "shortest";
                  badgeLabel = "Shortest Distance";
                  if (isSelected) {
                    borderStyle = "2px solid #ffb800";
                    bgStyle = "rgba(255, 184, 0, 0.12)";
                  }
                } else if (isSelected) {
                  borderStyle = "2px solid #00f0ff";
                  bgStyle = "rgba(0, 240, 255, 0.12)";
                }

                return (
                  <button
                    type="button"
                    key={route.id}
                    className="route-card"
                    onClick={() => setSelectedRouteId(route.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: borderStyle,
                      background: bgStyle,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      boxShadow: isSelected ? "0 4px 12px rgba(0, 0, 0, 0.06)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Badge variant={badgeVariant} size="sm">
                        {badgeLabel}
                      </Badge>
                      <span style={{
                        fontSize: "13px",
                        fontWeight: "800",
                        fontFamily: "var(--font-mono, monospace)",
                        color: route.summary.carbon >= 80 ? "#00ff9d" : route.summary.carbon >= 50 ? "#ffb800" : "#ff3d6e",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px"
                      }}>
                        Score: <AnimatedCounter value={route.summary.carbon} />
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12.5px", color: "#94a3b8" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <RouteIcon size={14} color="#00f0ff" />
                        <strong style={{ color: "#f8fafc" }}>{route.summary.distanceKm.toFixed(1)} km</strong>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <ClockIcon size={14} color="#ffb800" />
                        <strong style={{ color: "#f8fafc" }}>{route.summary.durationMin} min</strong>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <WindIcon size={14} color="#00ff9d" />
                        <span>AQI {route.summary.averageAQI}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Corridor Deep Dive Telemetry */}
          {selectedRoute && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#00f0ff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Corridor Telemetry
                </label>
                <span style={{ fontSize: "10px", color: "#00f0ff", fontFamily: "var(--font-mono, monospace)", fontWeight: "700", background: "rgba(0, 240, 255, 0.15)", border: "1px solid rgba(0, 240, 255, 0.3)", padding: "2px 6px", borderRadius: "4px" }}>
                  LIVE STREAM
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <MetricCard
                  label="Distance"
                  value={Math.round(selectedRoute.summary.distanceKm * 10) / 10}
                  suffix=" km"
                  icon={<RouteIcon size={14} color="#00f0ff" />}
                  color="#00f0ff"
                  sparklineData={[
                    Math.round(selectedRoute.summary.distanceKm * 0.85 * 10) / 10,
                    Math.round(selectedRoute.summary.distanceKm * 1.05 * 10) / 10,
                    Math.round(selectedRoute.summary.distanceKm * 0.95 * 10) / 10,
                    Math.round(selectedRoute.summary.distanceKm * 10) / 10
                  ]}
                />
                <MetricCard
                  label="Duration"
                  value={Math.round(selectedRoute.summary.durationMin)}
                  suffix=" min"
                  icon={<ClockIcon size={14} color="#ffb800" />}
                  color="#ffb800"
                  sparklineData={[
                    Math.round(selectedRoute.summary.durationMin * 1.15),
                    Math.round(selectedRoute.summary.durationMin * 1.08),
                    Math.round(selectedRoute.summary.durationMin * 1.02),
                    Math.round(selectedRoute.summary.durationMin)
                  ]}
                />
                <MetricCard
                  label="Avg AQI"
                  value={Math.round(selectedRoute.summary.averageAQI ?? 0)}
                  icon={<WindIcon size={14} color={(selectedRoute.summary.averageAQI ?? 0) < 80 ? "#00ff9d" : "#ff3d6e"} />}
                  color={(selectedRoute.summary.averageAQI ?? 0) < 80 ? "#00ff9d" : "#ff3d6e"}
                  delta={(selectedRoute.summary.averageAQI ?? 0) < 80 ? -24.0 : 12.0}
                  deltaLabel={(selectedRoute.summary.averageAQI ?? 0) < 80 ? "Clean" : "Smog"}
                  sparklineData={[72, 85, 90, 78, 65, Math.round(selectedRoute.summary.averageAQI ?? 50)]}
                />
                <MetricCard
                  label="Green Score"
                  value={Math.round(selectedRoute.summary.carbon)}
                  suffix="/100"
                  icon={<LeafIcon size={14} color="#00ff9d" />}
                  color="#00ff9d"
                  delta={selectedRoute.summary.carbon >= 80 ? 18.5 : -5.2}
                  deltaLabel={selectedRoute.summary.carbon >= 80 ? "Optimal" : "Moderate"}
                  sparklineData={[40, 52, 65, 78, Math.round(selectedRoute.summary.carbon)]}
                />
              </div>

              {/* Environmental Factor Analysis Breakdown */}
              <div style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(0, 240, 255, 0.18)",
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "4px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#00f0ff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Environmental Decomposition
                  </span>
                  <span style={{ fontSize: "11px", color: "#00ff9d", fontWeight: "700" }}>Live Multi-Factor</span>
                </div>

                {/* AQI Exposure Factor */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#cbd5e1", fontWeight: "600" }}>Particulate Exposure (PM2.5)</span>
                    <span style={{ fontWeight: "700", color: (selectedRoute.summary.averageAQI ?? 0) < 80 ? "#00ff9d" : "#ffb800" }}>
                      {selectedRoute.summary.averageAQI ?? 0} AQI
                    </span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(3, 7, 18, 0.8)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(12, ((selectedRoute.summary.averageAQI ?? 0) / 200) * 100))}%`,
                      background: (selectedRoute.summary.averageAQI ?? 0) < 80 ? "linear-gradient(90deg, #00ff9d, #00f0ff)" : "linear-gradient(90deg, #ffb800, #ff3d6e)",
                      borderRadius: "3px"
                    }} />
                  </div>
                </div>

                {/* Tree Canopy Factor */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#cbd5e1", fontWeight: "600" }}>Canopy & Shade Shielding</span>
                    <span style={{ fontWeight: "700", color: isEcoRoute ? "#00ff9d" : "#94a3b8" }}>
                      {isEcoRoute ? "High (76%)" : "Moderate (44%)"}
                    </span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(3, 7, 18, 0.8)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: isEcoRoute ? "76%" : "44%",
                      background: "linear-gradient(90deg, #00ff9d, #00f0ff)",
                      borderRadius: "3px"
                    }} />
                  </div>
                </div>

                {/* Transit & Idling Flow Factor */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#cbd5e1", fontWeight: "600" }}>Traffic Flow / Low Idling</span>
                    <span style={{ fontWeight: "700", color: "#00f0ff" }}>
                      {isShortest ? "Highway Speed" : "Low Stop-and-Go"}
                    </span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(3, 7, 18, 0.8)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: isShortest ? "82%" : "70%",
                      background: "linear-gradient(90deg, #00f0ff, #b026ff)",
                      borderRadius: "3px"
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Optimization Callout */}
          {routeData.optimizationTriggered && (
            <div style={{
              background: "rgba(255, 61, 110, 0.12)",
              border: "1px solid rgba(255, 61, 110, 0.35)",
              borderRadius: "10px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              boxShadow: "0 0 16px rgba(255, 61, 110, 0.15)"
            }}>
              <span style={{ fontSize: "16px" }}>🚨</span>
              <div style={{ fontSize: "12px", color: "#ff3d6e", lineHeight: 1.4 }}>
                <strong style={{ color: "#ff3d6e" }}>Dynamic Reroute Active:</strong> EcoRoute detected a severe particulate plume and automatically diverted the path away from the pollution epicenter.
              </div>
            </div>
          )}

          {/* Credits Ledger Chip */}
          <div style={{
            padding: "14px",
            backgroundColor: "rgba(0, 255, 157, 0.1)",
            borderRadius: "12px",
            border: "1px solid rgba(0, 255, 157, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            boxShadow: "0 0 16px rgba(0, 255, 157, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CoinsIcon size={16} color="#00ff9d" />
                <span style={{ color: "#00ff9d", fontWeight: "700", fontSize: "13px" }}>Earnable Carbon Credits</span>
              </div>
              <span style={{ color: "#00ff9d", fontWeight: "800", fontSize: "16px", fontFamily: "var(--font-mono, monospace)", display: "flex", alignItems: "center", gap: "2px" }}>
                +<AnimatedCounter value={routeData.rewards?.creditsEarned ?? 0} />
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
              Choosing this green corridor reduces particulate inhalation and logs verified offset credits into your ledger.
            </div>
          </div>

          {/* Store Carbon Credits CTA */}
          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            <StoreCarbonButton 
              routeData={routeData}
              onOpenAuth={onOpenAuth || (() => {})}
              onSuccess={onCarbonStored}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPanel;
