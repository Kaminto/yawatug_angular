import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isActive: boolean;
  type: 'recording' | 'speaking' | 'idle';
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  type,
  className
}) => {
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0));

  useEffect(() => {
    if (!isActive) {
      setAudioLevels(new Array(12).fill(0));
      return;
    }

    const interval = setInterval(() => {
      const levels = Array.from({ length: 12 }, () => {
        if (type === 'idle') return 0;
        
        // Simulate realistic audio levels
        const base = type === 'recording' ? 0.3 : 0.4;
        const variation = Math.random() * 0.6;
        return Math.min(1, base + variation);
      });
      
      setAudioLevels(levels);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, type]);

  const getBarColor = () => {
    switch (type) {
      case 'recording':
        return 'bg-gradient-to-t from-red-500 to-red-300';
      case 'speaking':
        return 'bg-gradient-to-t from-blue-500 to-blue-300';
      default:
        return 'bg-gradient-to-t from-muted to-muted-foreground/50';
    }
  };

  return (
    <div className={cn(
      "flex items-end justify-center gap-1 h-16 p-2 rounded-lg bg-muted/50",
      className
    )}>
      {audioLevels.map((level, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-full transition-all duration-150 ease-out",
            getBarColor(),
            isActive && "animate-pulse"
          )}
          style={{
            height: `${Math.max(4, level * 48)}px`,
            animationDelay: `${i * 50}ms`,
            opacity: isActive ? 0.8 + (level * 0.2) : 0.3
          }}
        />
      ))}
    </div>
  );
};