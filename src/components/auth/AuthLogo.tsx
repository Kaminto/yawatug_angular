import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function AuthLogo({ size = 'md', showText = false, className = '' }: AuthLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <Link 
      to="/" 
      className={`flex items-center gap-2 hover:opacity-80 transition-all duration-200 ${className}`}
    >
      <img 
        src="/yawatu-logo.png" 
        alt="Yawatu Minerals & Mining PLC" 
        className={`${sizeClasses[size]} object-contain drop-shadow-sm`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-primary ${textSizeClasses[size]} leading-tight`}>
            YAWATU
          </span>
          <span className="text-xs text-muted-foreground -mt-0.5 leading-tight">
            Minerals & Mining
          </span>
        </div>
      )}
    </Link>
  );
}