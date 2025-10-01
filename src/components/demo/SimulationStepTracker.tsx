import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play,
  User,
  Wallet,
  TrendingUp,
  Users,
  UserPlus,
  FileText
} from 'lucide-react';

interface SimulationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
}

interface SimulationStepTrackerProps {
  steps: SimulationStep[];
  currentStep: number;
  isRunning: boolean;
}

const SimulationStepTracker: React.FC<SimulationStepTrackerProps> = ({
  steps,
  currentStep,
  isRunning
}) => {
  const getStatusIcon = (status: string, isActive: boolean) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Play className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className={`h-5 w-5 ${isActive ? 'text-yellow-500' : 'text-gray-400'}`} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-500 text-white animate-pulse">Running</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card className="border-yawatu-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Simulation Progress</span>
          <div className="text-sm text-muted-foreground">
            {completedSteps}/{steps.length} Steps
          </div>
        </CardTitle>
        <Progress value={progress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep && isRunning;
          const isCompleted = step.status === 'completed';
          
          return (
            <div 
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                isActive 
                  ? 'border-yawatu-gold bg-yawatu-gold/5' 
                  : isCompleted 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {step.icon}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.title}</h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status, isActive)}
                    {getStatusBadge(step.status)}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
                
                {step.result && step.status === 'completed' && (
                  <div className="text-xs bg-gray-50 p-2 rounded border">
                    <div className="font-medium mb-1">Results:</div>
                    {step.id === 'registration' && (
                      <div>✓ User created: {step.result.email}</div>
                    )}
                    {step.id === 'wallet_setup' && (
                      <div>
                        ✓ Wallets funded: UGX {step.result.ugxBalance?.toLocaleString()}, 
                        USD {step.result.usdBalance?.toLocaleString()}
                      </div>
                    )}
                    {step.id === 'share_purchase' && (
                      <div>
                        ✓ Shares purchased: {step.result.quantity} shares for {step.result.totalAmount?.toLocaleString()} UGX
                      </div>
                    )}
                    {step.id === 'referral_system' && (
                      <div>
                        ✓ Referral code: {step.result.referralCode}<br/>
                        ✓ Total earnings: {step.result.totalEarnings?.toLocaleString()} UGX
                      </div>
                    )}
                    {step.id === 'agent_application' && (
                      <div>
                        ✓ Agent code: {step.result.agentCode}<br/>
                        ✓ Status: {step.result.status}<br/>
                        ✓ Earnings: {step.result.totalEarnings?.toLocaleString()} UGX
                      </div>
                    )}
                    {step.id === 'comprehensive_reports' && (
                      <div>
                        ✓ Business score: {step.result.businessScore}/100<br/>
                        ✓ Portfolio value: {step.result.portfolioValue?.toLocaleString()} UGX<br/>
                        ✓ Growth rate: {step.result.monthlyGrowth?.toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
                
                {step.status === 'error' && (
                  <div className="text-xs bg-red-50 text-red-700 p-2 rounded border">
                    ⚠️ Step failed - please check logs
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SimulationStepTracker;