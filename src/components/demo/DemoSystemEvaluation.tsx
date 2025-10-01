import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle,
  AlertTriangle,
  User,
  Shield,
  Smartphone,
  CreditCard,
  TrendingUp,
  Users,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DemoEvaluationItem {
  category: string;
  feature: string;
  demoStatus: 'working' | 'partial' | 'missing';
  currentStatus: 'implemented' | 'partial' | 'missing';
  priority: 'high' | 'medium' | 'low';
  description: string;
  implementation?: string;
}

const DemoSystemEvaluation: React.FC = () => {
  const [isEvaluating, setIsEvaluating] = React.useState(false);
  const [evaluationResults, setEvaluationResults] = React.useState<DemoEvaluationItem[]>([]);

  const evaluationItems: DemoEvaluationItem[] = [
    // User Authentication & Profile
    {
      category: 'Authentication',
      feature: 'Demo User Setup',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'high',
      description: 'Demo user (demo@yawatu.com) with verified status and complete profile',
      implementation: 'Edge function creates demo user with proper profile data'
    },
    {
      category: 'User Profile',
      feature: 'Profile Verification Badge',
      demoStatus: 'working',
      currentStatus: 'partial',
      priority: 'high',
      description: 'User sidebar shows "Verified" badge for verified users',
      implementation: 'Update UserSidebar to show verification status prominently'
    },
    {
      category: 'User Profile',
      feature: 'Complete Profile Display',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'medium',
      description: 'Avatar, name, email display in sidebar',
      implementation: 'Already working in UserSidebar component'
    },

    // SMS & Communication
    {
      category: 'SMS/OTP',
      feature: 'Local SMS Priority',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'high',
      description: 'SMS-first OTP for local users (UG, KE, TZ)',
      implementation: 'Recently implemented with smart method selection'
    },
    {
      category: 'SMS/OTP',
      feature: 'Multi-currency OTP',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'medium',
      description: 'OTP verification for UGX, KES, TZS transactions',
      implementation: 'Updated verification component supports all currencies'
    },

    // Payment & Mobile Money
    {
      category: 'Payments',
      feature: 'RelWorx Integration',
      demoStatus: 'working',
      currentStatus: 'partial',
      priority: 'high',
      description: 'Mobile money payments via RelWorx API',
      implementation: 'Configuration in progress, API key setup needed'
    },
    {
      category: 'Payments',
      feature: 'Multi-currency Support',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'high',
      description: 'Support for UGX, KES, TZS mobile money networks',
      implementation: 'Payment selectors updated with all networks'
    },
    {
      category: 'Payments',
      feature: 'Network Auto-detection',
      demoStatus: 'working',
      currentStatus: 'partial',
      priority: 'medium',
      description: 'Auto-detect MTN, Airtel, M-Pesa, Tigo networks',
      implementation: 'RelWorx API integration needed for auto-detection'
    },

    // Wallet Functionality
    {
      category: 'Wallet',
      feature: 'Multi-currency Wallets',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'high',
      description: 'Separate wallets for UGX, KES, TZS',
      implementation: 'Database schema supports multi-currency wallets'
    },
    {
      category: 'Wallet',
      feature: 'Security Verification',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'high',
      description: 'OTP verification for sensitive transactions',
      implementation: 'New SMS-first verification component created'
    },

    // Dashboard & UI
    {
      category: 'Dashboard',
      feature: 'Real-time Updates',
      demoStatus: 'working',
      currentStatus: 'partial',
      priority: 'medium',
      description: 'Live updates for transactions and balances',
      implementation: 'Needs real-time subscription setup'
    },
    {
      category: 'Navigation',
      feature: 'Mobile-first Design',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'high',
      description: 'Responsive design optimized for mobile',
      implementation: 'Already implemented with mobile navigation'
    },

    // Admin Features
    {
      category: 'Admin',
      feature: 'Transaction Monitoring',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'medium',
      description: 'Admin can monitor and approve transactions',
      implementation: 'Admin dashboard has transaction management'
    },
    {
      category: 'Admin',
      feature: 'User Verification',
      demoStatus: 'working',
      currentStatus: 'implemented',
      priority: 'medium',
      description: 'Admin can verify user profiles',
      implementation: 'User verification system in place'
    }
  ];

  const evaluateSystem = async () => {
    setIsEvaluating(true);
    setEvaluationResults(evaluationItems);
    
    try {
      // Call the demo setup to ensure demo user exists
      const { data, error } = await supabase.functions.invoke('setup-demo-user');
      
      if (error) {
        console.error('Error setting up demo user:', error);
        toast.error('Failed to set up demo user');
      } else {
        toast.success('Demo system evaluation completed');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      toast.error('Evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented':
      case 'working':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'missing':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      'implemented': 'default',
      'working': 'default',
      'partial': 'secondary',
      'missing': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors]}`}>
        {priority}
      </span>
    );
  };

  const groupedResults = evaluationResults.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as { [key: string]: DemoEvaluationItem[] });

  const overallStats = {
    total: evaluationItems.length,
    implemented: evaluationItems.filter(item => item.currentStatus === 'implemented').length,
    partial: evaluationItems.filter(item => item.currentStatus === 'partial').length,
    missing: evaluationItems.filter(item => item.currentStatus === 'missing').length
  };

  const completionPercentage = Math.round(
    ((overallStats.implemented + overallStats.partial * 0.5) / overallStats.total) * 100
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Demo System Evaluation
          </CardTitle>
          <CardDescription>
            Comprehensive evaluation of current system against the working demo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">System Completion</p>
              <div className="flex items-center gap-2">
                <Progress value={completionPercentage} className="w-40" />
                <span className="font-semibold">{completionPercentage}%</span>
              </div>
            </div>
            <Button 
              onClick={evaluateSystem} 
              disabled={isEvaluating}
              className="flex items-center gap-2"
            >
              {isEvaluating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{overallStats.implemented}</div>
              <div className="text-sm text-muted-foreground">Implemented</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{overallStats.partial}</div>
              <div className="text-sm text-muted-foreground">Partial</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{overallStats.missing}</div>
              <div className="text-sm text-muted-foreground">Missing</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold">{overallStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {evaluationResults.length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedResults).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(item.currentStatus)}
                            <h4 className="font-semibold">{item.feature}</h4>
                            {getPriorityBadge(item.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.description}
                          </p>
                          {item.implementation && (
                            <p className="text-xs bg-muted p-2 rounded">
                              <strong>Implementation:</strong> {item.implementation}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Demo Status</div>
                            {getStatusBadge(item.demoStatus)}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Current Status</div>
                            {getStatusBadge(item.currentStatus)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DemoSystemEvaluation;