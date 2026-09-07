import React from 'react';

export interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    positive?: boolean; // e.g. true for emissions reduction
    label?: string;
  };
  highlightColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const Metric: React.FC<MetricProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  highlightColor,
  size = 'md',
  className = '',
  style,
}) => {
  const getValueFontSize = () => {
    switch (size) {
      case 'sm': return '18px';
      case 'lg': return '28px';
      case 'md':
      default: return '22px';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        ...style,
      }}
      className={`ecoroute-metric ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
        {icon && <span style={{ color: highlightColor || 'var(--text-tertiary)', display: 'flex' }}>{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span
          className="tabular-data"
          style={{
            fontSize: getValueFontSize(),
            fontWeight: 800,
            color: highlightColor || 'var(--text-primary)',
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: trend.positive ? 'var(--brand-emerald-dark)' : 'var(--state-hazard)',
              backgroundColor: trend.positive ? 'var(--state-eco-bg)' : 'var(--state-hazard-bg)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            {trend.value}
          </span>
          {trend.label && (
            <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
