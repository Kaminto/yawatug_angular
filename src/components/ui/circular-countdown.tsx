import React from 'react';

interface CircularCountdownProps {
  totalSeconds?: number;
  elapsedSeconds?: number;
  size?: number; // px
  strokeWidth?: number; // px
  className?: string;
}

export const CircularCountdown: React.FC<CircularCountdownProps> = ({
  totalSeconds = 30,
  elapsedSeconds = 0,
  size = 120,
  strokeWidth = 8,
  className = ''
}) => {
  const clampedElapsed = Math.max(0, Math.min(elapsedSeconds, totalSeconds));
  const remaining = Math.max(totalSeconds - clampedElapsed, 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clampedElapsed / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={className} style={{ width: size, height: size }} aria-label={`Countdown: ${remaining} seconds remaining`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-yawatu-gold"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </g>
        {/* Center label */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="font-semibold fill-foreground"
          style={{ fontSize: Math.max(14, size * 0.28) }}
        >
          {remaining}s
        </text>
      </svg>
    </div>
  );
};

export default CircularCountdown;
