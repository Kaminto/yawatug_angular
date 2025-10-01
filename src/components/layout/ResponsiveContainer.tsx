import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
  noPadding?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  fullHeight = false,
  noPadding = false
}) => {
  const containerClasses = cn(
    "w-full mx-auto",
    fullHeight && "min-h-[calc(100vh-3.5rem)]",
    !noPadding && "p-3 md:p-4",
    "max-w-6xl",
    className
  );

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
};