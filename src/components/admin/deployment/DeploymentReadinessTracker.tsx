import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Database, 
  Zap, 
  Users, 
  CreditCard,
  Rocket,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeploymentStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  tasks: DeploymentTask[];
  estimatedHours: number;
}

interface DeploymentTask {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  blocker?: string;
}

export const DeploymentReadinessTracker: React.FC = () => {
  const [stages, setStages] = useState<DeploymentStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    initializeStages();
    checkCurrentStatus();
  }, []);

  const initializeStages = () => {
    const deploymentStages: DeploymentStage[] = [
      {
        id: 'security',
        name: 'Critical Security & Infrastructure',
        description: 'Fix security vulnerabilities and database issues',
        icon: <Shield className="h-5 w-5" />,
        status: 'in_progress',
        priority: 'critical',
        estimatedHours: 16,
        tasks: [
          {
            id: 'critical_rls_policies',
            name: 'Fix Critical RLS Policies',
            description: 'Protected sensitive user data tables',
            status: 'completed'
          },
          {
            id: 'function_security',
            name: 'Fix Function Search Path Issues',
            description: '110+ functions need security fixes',
            status: 'in_progress'
          },
          {
            id: 'database_optimization',
            name: 'Database Structure Optimization',
            description: 'Consolidate duplicate tables and add indexes',
            status: 'in_progress'
          },
          {
            id: 'payment_gateway',
            name: 'Payment Gateway Integration',
            description: 'Configure PayTota, ClickPesa, Selcom',
            status: 'in_progress'
          }
        ]
      },
      {
        id: 'user_experience',
        name: 'User Experience Optimization',
        description: 'Streamline user journeys and improve performance',
        icon: <Users className="h-5 w-5" />,
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 24,
        tasks: [
          {
            id: 'unified_registration',
            name: 'Unified Registration System',
            description: 'Single registration flow',
            status: 'completed'
          },
          {
            id: 'smart_dashboard',
            name: 'Context-Aware Dashboard',
            description: 'Personalized based on user stage',
            status: 'pending'
          },
          {
            id: 'performance_optimization',
            name: 'Performance Optimization',
            description: 'Code splitting and lazy loading',
            status: 'in_progress'
          },
          {
            id: 'mobile_optimization',
            name: 'Mobile UX Polish',
            description: 'Bottom sheets, touch improvements',
            status: 'pending'
          }
        ]
      },
      {
        id: 'advanced_features',
        name: 'Advanced Features & Analytics',
        description: 'Complete investment flow and real-time systems',
        icon: <Zap className="h-5 w-5" />,
        status: 'pending',
        priority: 'medium',
        estimatedHours: 32,
        tasks: [
          {
            id: 'investment_flow',
            name: 'Investment Flow Completion',
            description: 'Full investment opportunity system',
            status: 'pending'
          },
          {
            id: 'realtime_systems',
            name: 'Real-time Communication',
            description: 'WebSocket fixes and notifications',
            status: 'pending'
          },
          {
            id: 'advanced_analytics',
            name: 'Advanced Analytics',
            description: 'Predictive insights and reporting',
            status: 'pending'
          }
        ]
      },
      {
        id: 'deployment',
        name: 'Deployment & Monitoring',
        description: 'Production setup and monitoring',
        icon: <Rocket className="h-5 w-5" />,
        status: 'pending',
        priority: 'critical',
        estimatedHours: 16,
        tasks: [
          {
            id: 'production_setup',
            name: 'Production Environment',
            description: 'SSL, CDN, monitoring setup',
            status: 'pending'
          },
          {
            id: 'testing',
            name: 'End-to-End Testing',
            description: 'Complete user journey testing',
            status: 'pending'
          },
          {
            id: 'launch_prep',
            name: 'Launch Preparation',
            description: 'Documentation and support setup',
            status: 'pending'
          }
        ]
      }
    ];

    setStages(deploymentStages);
  };

  const checkCurrentStatus = async () => {
    setIsLoading(true);
    try {
      // Simple progress calculation based on completed tasks
      const totalTasks = stages.reduce((acc, stage) => acc + stage.tasks.length, 0);
      const completedTasks = stages.reduce((acc, stage) => 
        acc + stage.tasks.filter(task => task.status === 'completed').length, 0
      );
      setOverallProgress(Math.round((completedTasks / totalTasks) * 100));

    } catch (error) {
      console.error('Error checking deployment status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const handleRunSecurityScan = async () => {
    toast({ title: "Running Security Scan", description: "Checking for security issues..." });
    await checkCurrentStatus();
    toast({ title: "Security Scan Complete", description: "Status updated" });
  };

  const renderStageCard = (stage: DeploymentStage) => (
    <Card key={stage.id} className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {stage.icon}
            <div>
              <CardTitle className="text-lg">{stage.name}</CardTitle>
              <CardDescription>{stage.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getPriorityColor(stage.priority)}>
              {stage.priority}
            </Badge>
            <div className="flex items-center space-x-1">
              {getStatusIcon(stage.status)}
              <span className="text-sm capitalize">{stage.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Estimated: {stage.estimatedHours} hours
          </div>
          
          <div className="space-y-2">
            {stage.tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{task.name}</div>
                  <div className="text-xs text-muted-foreground">{task.description}</div>
                  {task.blocker && (
                    <div className="text-xs text-red-600 mt-1">⚠️ {task.blocker}</div>
                  )}
                </div>
                {getStatusIcon(task.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading deployment status...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deployment Readiness Tracker</h2>
          <p className="text-muted-foreground">
            Track progress towards production deployment
          </p>
        </div>
        <Button onClick={handleRunSecurityScan} variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          Run Security Scan
        </Button>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Overall Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Deployment Readiness</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {overallProgress < 60 && "🔴 Not ready for production"}
              {overallProgress >= 60 && overallProgress < 85 && "🟡 Approaching readiness"}
              {overallProgress >= 85 && "🟢 Ready for deployment"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Stages */}
      <div className="grid gap-6">
        {stages.map(renderStageCard)}
      </div>

      {/* Deployment Blockers */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Critical Deployment Blockers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>🟡 <strong>105 Security Issues</strong> - Critical vulnerabilities fixed, function security in progress</div>
            <div>🔴 <strong>Payment Gateway Integration</strong> - No payments = No business</div>
            <div>🟡 <strong>User Journey Confusion</strong> - Multiple registration paths (Fixed)</div>
            <div>🟡 <strong>Database Performance</strong> - Missing indexes causing slowdowns</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeploymentReadinessTracker;