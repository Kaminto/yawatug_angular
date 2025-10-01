import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Award,
  ArrowRight,
  Wallet,
  Users,
  Activity,
  User
} from 'lucide-react';
import { SmartInsight } from '@/hooks/useSmartDashboard';

interface SmartInsightsWidgetProps {
  insights: SmartInsight[];
  nextBestAction: SmartInsight | null;
}

const SmartInsightsWidget: React.FC<SmartInsightsWidgetProps> = ({ insights, nextBestAction }) => {
  const getIcon = (iconName?: string) => {
    const iconProps = { className: "h-5 w-5" };
    switch (iconName) {
      case 'Wallet': return <Wallet {...iconProps} />;
      case 'TrendingUp': return <TrendingUp {...iconProps} />;
      case 'Users': return <Users {...iconProps} />;
      case 'Activity': return <Activity {...iconProps} />;
      case 'User': return <User {...iconProps} />;
      case 'Award': return <Award {...iconProps} />;
      default: return <Lightbulb {...iconProps} />;
    }
  };

  const getTypeColor = (type: SmartInsight['type']) => {
    switch (type) {
      case 'opportunity': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'achievement': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
      case 'recommendation': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      default: return 'bg-muted';
    }
  };

  const getPriorityBadge = (priority: SmartInsight['priority']) => {
    const colors = {
      high: 'bg-red-500/10 text-red-700 border-red-500/20',
      medium: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
      low: 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    };
    return <Badge variant="outline" className={`${colors[priority]} text-xs`}>{priority}</Badge>;
  };

  if (insights.length === 0) return null;

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Insights</CardTitle>
              <CardDescription className="text-xs">Personalized recommendations for you</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Next Best Action - Highlighted */}
        {nextBestAction && (
          <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg ${getTypeColor(nextBestAction.type)}`}>
                {getIcon(nextBestAction.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{nextBestAction.title}</h4>
                  {getPriorityBadge(nextBestAction.priority)}
                </div>
                <p className="text-xs text-muted-foreground">{nextBestAction.description}</p>
              </div>
            </div>
            {nextBestAction.action && (
              <Button asChild className="w-full" size="sm">
                <Link to={nextBestAction.action.path}>
                  {nextBestAction.action.label}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Other Insights */}
        {insights.slice(0, 3).map((insight) => {
          if (insight.id === nextBestAction?.id) return null;
          
          return (
            <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/30 hover:bg-accent/5 transition-colors">
              <div className={`p-2 rounded-lg ${getTypeColor(insight.type)} flex-shrink-0`}>
                {getIcon(insight.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  {getPriorityBadge(insight.priority)}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                {insight.action && (
                  <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                    <Link to={insight.action.path}>
                      {insight.action.label} <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SmartInsightsWidget;
