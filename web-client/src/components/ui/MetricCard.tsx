import React, { type ReactNode } from 'react';
import AnimatedCounter from './AnimatedCounter';

export interface MetricCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  delta?: number;
  deltaLabel?: string;
  sparklineData?: number[];
  color?: string;
  suffix?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  icon, 
  delta, 
  deltaLabel, 
  sparklineData, 
  color = 'var(--color-accent-cyan, #00f0ff)', 
  suffix = '',
  className = ''
}) => {
  const deltaColor = delta !== undefined 
    ? (delta >= 0 ? 'var(--color-accent-emerald, #00ff9d)' : 'var(--color-accent-rose, #ff3d6e)') 
    : undefined;

  return (
    <div 
      className={className}
      style={{ 
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backgroundColor: "#0f172a",
        padding: "12px 14px",
        borderLeft: `3px solid ${color}`,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        {icon && (
          <span style={{ color, width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </span>
        )}
      </div>
      
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span style={{ fontSize: "18px", fontWeight: "800", fontFamily: "var(--font-mono, monospace)", color: "#f8fafc", letterSpacing: "-0.02em" }}>
          <AnimatedCounter value={value} />{suffix}
        </span>
        {delta !== undefined && (
          <span style={{ color: deltaColor, fontSize: "11px", fontFamily: "var(--font-mono, monospace)", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
            {deltaLabel && <span style={{ color: "#94a3b8", marginLeft: "2px", fontWeight: "500" }}>{deltaLabel}</span>}
          </span>
        )}
      </div>

      {sparklineData && sparklineData.length > 1 && (
        <div style={{ height: "18px", width: "100%", marginTop: "4px", overflow: "hidden" }}>
          <svg 
            viewBox={`0 0 ${sparklineData.length - 1} 20`} 
            style={{ width: "100%", height: "18px", display: "block" }}
            preserveAspectRatio="none"
          >
            <polyline
              points={sparklineData.map((v, i) => `${i},${20 - (v / (Math.max(...sparklineData, 1))) * 16}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.85 }}
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
