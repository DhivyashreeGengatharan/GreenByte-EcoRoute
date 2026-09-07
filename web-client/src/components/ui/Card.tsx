import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'obsidian' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  padding = 'md',
  className = '',
  onClick,
  style,
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return '12px';
      case 'lg': return '24px';
      case 'md':
      default: return '16px';
    }
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--surface-glass-border)',
          boxShadow: 'var(--shadow-sm)',
        };
      case 'obsidian':
        return {
          backgroundColor: 'var(--obsidian-surface)',
          border: '1px solid var(--obsidian-border)',
          color: 'var(--text-inverse)',
          boxShadow: 'var(--shadow-lg)',
        };
      case 'interactive':
        return {
          backgroundColor: 'var(--surface-panel-elevated)',
          border: '1px solid var(--surface-glass-border)',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'pointer',
          transition: 'all var(--dur-fast) var(--ease-spring)',
        };
      case 'glass':
      default:
        return {
          backgroundColor: 'var(--surface-panel)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--surface-glass-border)',
          boxShadow: 'var(--shadow-md)',
        };
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: getPadding(),
        ...getVariantStyles(),
        ...style,
      }}
      className={`ecoroute-card ${className}`}
    >
      {children}
    </div>
  );
};
