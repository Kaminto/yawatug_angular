import { Badge } from "@/components/ui/badge";
import { Crown, Star, Medal, Award } from "lucide-react";

interface AgentTierBadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  className?: string;
}

const tierConfig = {
  bronze: {
    label: "Bronze Agent",
    icon: Medal,
    variant: "secondary" as const,
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  silver: {
    label: "Silver Agent", 
    icon: Star,
    variant: "outline" as const,
    className: "bg-slate-100 text-slate-800 border-slate-300",
  },
  gold: {
    label: "Gold Agent",
    icon: Award,
    variant: "default" as const,
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  platinum: {
    label: "Platinum Agent",
    icon: Crown,
    variant: "default" as const,
    className: "bg-purple-100 text-purple-800 border-purple-300",
  },
};

export function AgentTierBadge({ tier, className }: AgentTierBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}