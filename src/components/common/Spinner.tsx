import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({
  size = 'md',
  text,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-slate-400">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600`} />
      {text && <span className="text-xs font-medium">{text}</span>}
    </div>
  );
};
