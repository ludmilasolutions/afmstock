import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'ok' | 'low' | 'critical' | 'neutral' | 'indigo' | 'primary';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-2xs',
    low: 'bg-amber-50 text-amber-800 border-amber-300/80 shadow-2xs',
    critical: 'bg-rose-50 text-rose-800 border-rose-300/80 shadow-2xs',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200/90 shadow-2xs',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200/90 shadow-2xs',
    primary: 'bg-indigo-50 text-indigo-800 border-indigo-200/90 shadow-2xs',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-wide uppercase transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
