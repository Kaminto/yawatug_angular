
import React from 'react';
import { Loader2 } from 'lucide-react';

interface EnhancedLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({
  size = 'md',
  text = 'Loading...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-yawatu-gold`} />
      {text && <span className="text-muted-foreground">{text}</span>}
    </div>
  );
};
