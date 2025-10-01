import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BusinessMetrics {
  monthlyGrowth: number;
  diversificationScore: number;
  activityScore: number;
  riskProfile: string;
  totalValue: number;
  profitability: number;
}

interface BusinessInsight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  action?: string;
}

interface BusinessInsightsDashboardProps {
  metrics: BusinessMetrics;
  insights: BusinessInsight[];
}

const BusinessInsightsDashboard: React.FC<BusinessInsightsDashboardProps> = ({
  metrics,
  insights
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-purple-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getInsightBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
      case 'info':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Info</Badge>;
      case 'tip':
        return <Badge variant="secondary" className="bg-purple-500 text-white">Tip</Badge>;
      default:
        return <Badge variant="outline">Note</Badge>;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'conservative':
        return 'text-green-600 bg-green-50';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50';
      case 'aggressive':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <Card className="border-yawatu-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-yawatu-gold" />
            Business Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Monthly Growth */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {metrics.monthlyGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">Growth Rate</span>
              </div>
              <div className={`text-2xl font-bold ${
                metrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.monthlyGrowth >= 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Monthly</div>
            </div>

            {/* Total Business Value */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yawatu-gold" />
                <span className="text-sm text-muted-foreground">Total Value</span>
              </div>
              <div className="text-2xl font-bold text-yawatu-gold">
                {formatCurrency(metrics.totalValue, 'UGX')}
              </div>
              <div className="text-xs text-muted-foreground">All assets</div>
            </div>

            {/* Diversification Score */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Diversification</span>
              </div>
              <div className="text-2xl font-bold">{metrics.diversificationScore}/100</div>
              <Progress value={metrics.diversificationScore} className="h-2" />
            </div>

            {/* Activity Score */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Activity</span>
              </div>
              <div className="text-2xl font-bold">{metrics.activityScore}/100</div>
              <Progress value={metrics.activityScore} className="h-2" />
            </div>
          </div>

          {/* Risk Profile */}
          <div className="mt-6 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Risk Profile</span>
                <div className={`inline-block ml-2 px-2 py-1 rounded text-sm font-medium ${getRiskColor(metrics.riskProfile)}`}>
                  {metrics.riskProfile}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Profitability</span>
                <div className={`text-lg font-bold ${
                  metrics.profitability >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics.profitability >= 0 ? '+' : ''}{metrics.profitability.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Insights */}
      <Card className="border-yawatu-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yawatu-gold" />
            Business Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50"
            >
              <div className="flex-shrink-0 mt-1">
                {getInsightIcon(insight.type)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{insight.title}</h4>
                  {getInsightBadge(insight.type)}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {insight.description}
                </p>
                
                {insight.action && (
                  <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded border">
                    <strong>Recommended Action:</strong> {insight.action}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessInsightsDashboard;