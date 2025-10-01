import React from 'react';
import { AuthLogo } from '@/components/auth/AuthLogo';

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
  className?: string;
}

export function BrandHeader({ 
  title, 
  subtitle, 
  size = 'md', 
  centered = false, 
  className = '' 
}: BrandHeaderProps) {
  return (
    <div className={`${centered ? 'text-center' : ''} ${className}`}>
      <div className={`${centered ? 'justify-center' : ''} flex items-center mb-3`}>
        <AuthLogo size={size} showText={true} />
      </div>
      
      {title && (
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}