import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'eco' | 'shortest' | 'alt' | 'caution' | 'hazard' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'eco',
  size = 'md',
  dot = false,
  className = '',
  style,
}) => {
  const getVariantStyles = (): { bg: string; color: string; border: string; dotColor: string } => {
    switch (variant) {
      case 'eco':
        return {
          bg: 'var(--state-eco-bg)',
          color: 'var(--brand-emerald-dark)',
          border: 'var(--state-eco-border)',
          dotColor: 'var(--brand-emerald)',
        };
      case 'shortest':
        return {
          bg: 'var(--accent-indigo-light)',
          color: 'var(--accent-indigo)',
          border: 'rgba(99, 102, 241, 0.3)',
          dotColor: 'var(--accent-indigo)',
        };
      case 'caution':
        return {
          bg: 'var(--state-caution-bg)',
          color: '#b45309',
          border: 'var(--state-caution-border)',
          dotColor: 'var(--state-caution)',
        };
      case 'hazard':
        return {
          bg: 'var(--state-hazard-bg)',
          color: '#b91c1c',
          border: 'var(--state-hazard-border)',
          dotColor: 'var(--state-hazard)',
        };
      case 'info':
        return {
          bg: 'var(--state-info-bg)',
          color: '#1d4ed8',
          border: 'var(--state-info-border)',
          dotColor: 'var(--state-info)',
        };
      case 'alt':
      case 'neutral':
      default:
        return {
          bg: 'rgba(241, 245, 249, 0.9)',
          color: '#475569',
          border: '#e2e8f0',
          dotColor: '#94a3b8',
        };
    }
  };

  const v = getVariantStyles();
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSm ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        backgroundColor: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        userSelect: 'none',
        ...style,
      }}
      className={className}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: v.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
};
