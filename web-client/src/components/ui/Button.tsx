import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'ghost' | 'hazard' | 'obsidian';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--brand-emerald)',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        };
      case 'secondary':
        return {
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          color: '#f8fafc',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        };
      case 'subtle':
        return {
          backgroundColor: 'var(--brand-emerald-light)',
          color: 'var(--brand-emerald-dark)',
          border: '1px solid var(--state-eco-border)',
        };
      case 'obsidian':
        return {
          backgroundColor: 'var(--obsidian-surface)',
          color: 'var(--text-inverse)',
          border: '1px solid var(--obsidian-border)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        };
      case 'hazard':
        return {
          backgroundColor: 'var(--state-hazard)',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
          border: 'none',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: 'none',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '6px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)' };
      case 'lg':
        return { padding: '14px 24px', fontSize: '15px', borderRadius: 'var(--radius-md)' };
      case 'md':
      default:
        return { padding: '10px 18px', fontSize: '13.5px', borderRadius: 'var(--radius-md)' };
    }
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.65 : 1,
        transition: 'all var(--dur-fast) var(--ease-spring)',
        userSelect: 'none',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      className={`hero-btn ${className}`}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
};

export default Button;

