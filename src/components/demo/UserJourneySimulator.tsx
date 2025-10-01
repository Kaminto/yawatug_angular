import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Wallet, 
  TrendingUp, 
  Users, 
  UserPlus, 
  FileText,
  Play,
  CheckCircle,
  Clock,
  DollarSign,
  RotateCcw,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RealtimeSimulationDashboard from './RealtimeSimulationDashboard';
import SimulationStepTracker from './SimulationStepTracker';
import EnhancedErrorMonitor from './EnhancedErrorMonitor';

interface SimulationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
}

interface ErrorCollector {
  step: string;
  error: string;
  timestamp: string;
  critical: boolean;
}

const UserJourneySimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationResults, setSimulationResults] = useState<any>({});
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [errorCollector, setErrorCollector] = useState<ErrorCollector[]>([]);
  const [simulationComplete, setSimulationComplete] = useState(false);
  
  const [steps, setSteps] = useState<SimulationStep[]>([
    {
      id: 'demo_connection',
      title: 'Demo Account Connection',
      description: 'Connect to the existing demo user account',
      icon: <User className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'wallet_setup',
      title: 'Wallet Setup & Funding',
      description: 'Initialize wallets and simulate deposits',
      icon: <Wallet className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'share_purchase',
      title: 'Share Purchase',
      description: 'Buy shares using wallet funds',
      icon: <TrendingUp className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'referral_system',
      title: 'Referral Activities',
      description: 'Generate referral code and simulate referrals',
      icon: <Users className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'agent_application',
      title: 'Agent Application',
      description: 'Apply to become an agent and process approval',
      icon: <UserPlus className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'comprehensive_reports',
      title: 'Generate Reports',
      description: 'Create comprehensive business reports',
      icon: <FileText className="h-5 w-5" />,
      status: 'pending'
    }
  ]);

  const updateStepStatus = (stepId: string, status: SimulationStep['status'], result?: any, error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, result, error }
        : step
    ));
  };

  const collectError = (step: string, error: string, critical: boolean = false) => {
    const errorEntry: ErrorCollector = {
      step,
      error,
      timestamp: new Date().toISOString(),
      critical
    };
    setErrorCollector(prev => [...prev, errorEntry]);
    console.log(`${critical ? '🚨' : '⚠️'} ${step}: ${error}`);
  };

  const simulateDemoConnection = async () => {
    updateStepStatus('demo_connection', 'running');
    
    try {
      console.log('🎯 Connecting to demo user account...');
      
      // Just sign in with the existing demo credentials - no need to create
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'demo@yawatu.com',
        password: 'DemoPassword123!'
      });

      console.log('📝 Sign in result:', authData?.user?.id, signInError ? `Error: ${signInError.message}` : 'Success');

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        toast.error(`Demo connection failed: ${signInError.message}`);
        throw new Error(`Demo connection failed: ${signInError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from authentication');
      }

      const userData = authData.user;
      toast.success('Demo account connected successfully');

      // Store user data immediately for other steps to use
      setSimulationResults(prev => ({
        ...prev,
        user: userData
      }));

      updateStepStatus('demo_connection', 'completed', { 
        userId: userData?.id,
        email: 'demo@yawatu.com',
        name: 'Demo User'
      });

      return userData;

    } catch (error) {
      console.error('Demo account connection error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown connection error';
      updateStepStatus('demo_connection', 'error', null, errorMsg);
      collectError('demo_connection', errorMsg, true);
      toast.error('Demo account connection failed - using mock data');
      
      // Return mock user data to allow simulation to continue
      return {
        id: crypto.randomUUID(),
        email: 'demo@yawatu.com'
      };
    }
  };

  const simulateWalletOperations = async (userData?: any) => {
    updateStepStatus('wallet_setup', 'running');
    
    try {
      const user = userData || simulationResults.user;
      if (!user) throw new Error('No user found');

      // Simulate wallet transactions using the existing demo user data
      const operations = [
        { type: 'deposit', currency: 'USD', amount: 500, description: 'Demo USD deposit' },
        { type: 'deposit', currency: 'UGX', amount: 1000000, description: 'Demo UGX deposit' },
        { type: 'transfer', amount: 250000, description: 'Demo internal transfer' }
      ];

      const results = [];
      for (const operation of operations) {
        // Get or create wallet for the operation
        let { data: walletData } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('currency', operation.currency)
          .single();

        if (!walletData) {
          // Create wallet if it doesn't exist
          const { data: newWallet } = await supabase
            .from('wallets')
            .insert({
              user_id: user.id,
              currency: operation.currency,
              balance: 0
            })
            .select()
            .single();
          walletData = newWallet;
        }

        if (walletData) {
          const transactionAmount = operation.type === 'withdraw' ? -operation.amount : operation.amount;
          
          await supabase.from('transactions').insert({
            user_id: user.id,
            wallet_id: walletData.id,
            amount: transactionAmount,
            currency: operation.currency,
            transaction_type: operation.type,
            status: 'completed',
            approval_status: 'approved',
            description: operation.description
          });

          // Update wallet balance
          const newBalance = walletData.balance + transactionAmount;
          await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', walletData.id);
        }

        results.push(operation);
      }

      updateStepStatus('wallet_setup', 'completed', { operations: results });

    } catch (error) {
      console.error('Wallet simulation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown wallet error';
      updateStepStatus('wallet_setup', 'error', null, errorMsg);
      collectError('wallet_setup', errorMsg, false);
    }
  };

  const simulateSharePurchase = async (userData?: any) => {
    updateStepStatus('share_purchase', 'running');
    
    try {
      const user = userData || simulationResults.user;
      if (!user) throw new Error('No user found');

      // Get the existing share pool
      let { data: sharePool } = await supabase
        .from('shares')
        .select('*')
        .limit(1)
        .single();

      if (sharePool) {
        const purchaseAmount = 500000;
        const shareQuantity = Math.floor(purchaseAmount / sharePool.price_per_share);
        
        // Get UGX wallet
        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('currency', 'UGX')
          .single();

        if (walletData) {
          // Create purchase transaction
          await supabase.from('transactions').insert({
            user_id: user.id,
            wallet_id: walletData.id,
            amount: -purchaseAmount,
            currency: 'UGX',
            transaction_type: 'share_purchase',
            status: 'completed',
            description: `Demo share purchase - ${shareQuantity} shares`
          });

          // Add shares to user or update existing
          await supabase.from('user_shares').upsert({
            user_id: user.id,
            share_id: sharePool.id,
            quantity: shareQuantity,
            purchase_price_per_share: sharePool.price_per_share,
            currency: 'UGX'
          });

          // Update wallet balance
          await supabase
            .from('wallets')
            .update({ balance: walletData.balance - purchaseAmount })
            .eq('id', walletData.id);

          updateStepStatus('share_purchase', 'completed', { shareQuantity, purchaseAmount });
        }
      }

    } catch (error) {
      console.error('Share purchase simulation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown share purchase error';
      updateStepStatus('share_purchase', 'error', null, errorMsg);
      collectError('share_purchase', errorMsg, false);
    }
  };

  const simulateReferralSystem = async (userData?: any) => {
    updateStepStatus('referral_system', 'running');
    
    try {
      const user = userData || simulationResults.user;
      if (!user) throw new Error('No user found');

      // Use existing referral code or create one
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      const referralCode = profileData?.referral_code || `REF${user.id.substring(0, 8).toUpperCase()}`;
      
      // Simulate referral earnings
      const earnings = [
        { amount: 25000, description: 'Friend registration bonus' },
        { amount: 50000, description: 'First purchase commission' }
      ];

      let totalEarnings = 0;
      for (const earning of earnings) {
        // Get UGX wallet
        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('currency', 'UGX')
          .single();

        if (walletData) {
          await supabase.from('transactions').insert({
            user_id: user.id,
            wallet_id: walletData.id,
            amount: earning.amount,
            currency: 'UGX',
            transaction_type: 'referral_bonus',
            status: 'completed',
            description: earning.description
          });

          // Update wallet balance
          await supabase
            .from('wallets')
            .update({ balance: walletData.balance + earning.amount })
            .eq('id', walletData.id);
        }

        totalEarnings += earning.amount;
      }

      updateStepStatus('referral_system', 'completed', { 
        referralCode,
        totalEarnings,
        activities: earnings
      });

    } catch (error) {
      console.error('Referral simulation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown referral error';
      updateStepStatus('referral_system', 'error', null, errorMsg);
      collectError('referral_system', errorMsg, false);
    }
  };

  const simulateAgentApplication = async (userData?: any) => {
    updateStepStatus('agent_application', 'running');
    
    try {
      const user = userData || simulationResults.user;
      if (!user) throw new Error('No user found');

      // Check if agent already exists
      let { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!agentData) {
        // Create agent record
        const agentCode = `AGT${user.id.substring(0, 6).toUpperCase()}`;
        
        const { data: newAgent } = await supabase
          .from('agents')
          .insert({
            user_id: user.id,
            agent_code: agentCode,
            commission_rate: 0.05,
            status: 'active',
            tier: 'bronze',
            fee_share_percentage: 30
          })
          .select()
          .single();
          
        agentData = newAgent;
      }

      // Simulate agent earnings
      const earnings = [
        { amount: 12000, description: 'Client deposit fee share' },
        { amount: 25000, description: 'Share purchase commission' }
      ];

      let totalAgentEarnings = 0;
      for (const earning of earnings) {
        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('currency', 'UGX')
          .single();

        if (walletData) {
          await supabase.from('transactions').insert({
            user_id: user.id,
            wallet_id: walletData.id,
            amount: earning.amount,
            currency: 'UGX',
            transaction_type: 'agent_earning',
            status: 'completed',
            description: earning.description
          });

          // Update wallet balance
          await supabase
            .from('wallets')
            .update({ balance: walletData.balance + earning.amount })
            .eq('id', walletData.id);
        }

        totalAgentEarnings += earning.amount;
      }

      updateStepStatus('agent_application', 'completed', { 
        agentCode: agentData?.agent_code,
        totalEarnings: totalAgentEarnings,
        status: 'active'
      });

    } catch (error) {
      console.error('Agent simulation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown agent error';
      updateStepStatus('agent_application', 'error', null, errorMsg);
      collectError('agent_application', errorMsg, false);
    }
  };

  const generateComprehensiveReports = async (userData?: any) => {
    updateStepStatus('comprehensive_reports', 'running');
    
    try {
      const user = userData || simulationResults.user;
      if (!user) throw new Error('No user found');

      // Generate final report
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      const { data: wallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id);

      const { data: userShares } = await supabase
        .from('user_shares')
        .select('*')
        .eq('user_id', user.id);

      const totalBalance = wallets?.reduce((sum, wallet) => sum + (wallet.balance || 0), 0) || 0;
      const totalTransactions = transactions?.length || 0;
      const totalShares = userShares?.reduce((sum, share) => sum + (share.quantity || 0), 0) || 0;

      const finalReport = {
        totalBalance,
        totalTransactions,
        totalShares,
        walletCount: wallets?.length || 0,
        agentStatus: 'Active',
        referralEarnings: transactions?.filter(t => t.transaction_type === 'referral_bonus')
          .reduce((sum, t) => sum + t.amount, 0) || 0
      };

      setSimulationResults(prev => ({
        ...prev,
        finalReport
      }));

      updateStepStatus('comprehensive_reports', 'completed', finalReport);

    } catch (error) {
      console.error('Report generation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown report error';
      updateStepStatus('comprehensive_reports', 'error', null, errorMsg);
      collectError('comprehensive_reports', errorMsg, false);
    }
  };

  const runCompleteSimulation = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setCurrentStep(0);
    setErrorCollector([]);
    setSimulationComplete(false);
    
    // Reset all steps to pending
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', error: undefined })));
    
    // Step 1: Demo Connection
    setCurrentStep(0);
    const userData = await simulateDemoConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Wallet Operations (continue regardless of previous step result)
    setCurrentStep(1);
    await simulateWalletOperations(userData);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Share Purchase (continue regardless of previous step result)
    setCurrentStep(2);
    await simulateSharePurchase(userData);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Referral System (continue regardless of previous step result)
    setCurrentStep(3);
    await simulateReferralSystem(userData);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Agent Application (continue regardless of previous step result)
    setCurrentStep(4);
    await simulateAgentApplication(userData);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Comprehensive Reports (continue regardless of previous step result)
      setCurrentStep(5);
      await generateComprehensiveReports(userData);
      await new Promise(resolve => setTimeout(resolve, 500));

    setIsRunning(false);
    setSimulationComplete(true);
    
    const errorCount = errorCollector.length;
    const criticalErrors = errorCollector.filter(e => e.critical).length;
    
    if (errorCount === 0) {
      toast.success('✅ Complete simulation finished with no errors!');
    } else {
      toast.warning(`⚠️ Simulation completed with ${errorCount} error(s) (${criticalErrors} critical). Check the Error Analysis below.`);
    }
  };

  const progress = ((steps.filter(step => step.status === 'completed').length) / steps.length) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            User Journey Simulator
          </CardTitle>
          <CardDescription>
            Simulate the complete user experience using the existing demo account (demo@yawatu.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium">Simulation Progress</p>
              <Progress value={progress} className="w-[300px]" />
              <p className="text-xs text-muted-foreground">
                {steps.filter(step => step.status === 'completed').length} of {steps.length} steps completed
              </p>
            </div>
            <Button 
              onClick={runCompleteSimulation}
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? 'Running Simulation...' : 'Start Demo Simulation'}
            </Button>
          </div>

          <div className="grid gap-4">
            {steps.map((step, index) => (
              <Card key={step.id} className={`
                ${step.status === 'running' ? 'border-primary' : ''}
                ${step.status === 'completed' ? 'border-green-500' : ''}
                ${step.status === 'error' ? 'border-red-500' : ''}
              `}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2 rounded-full
                        ${step.status === 'running' ? 'bg-primary text-primary-foreground animate-pulse' : ''}
                        ${step.status === 'completed' ? 'bg-green-500 text-white' : ''}
                        ${step.status === 'error' ? 'bg-red-500 text-white' : ''}
                        ${step.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                      `}>
                        {step.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                         step.status === 'running' ? <Clock className="h-4 w-4" /> :
                         step.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.status === 'completed' && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Completed
                        </Badge>
                      )}
                      {step.status === 'running' && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Running
                        </Badge>
                      )}
                      {step.status === 'error' && (
                        <Badge variant="destructive">
                          Error
                        </Badge>
                      )}
                      {step.status === 'pending' && (
                        <Badge variant="secondary">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {step.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{step.error}</p>
                    </div>
                  )}
                  
                  {step.result && step.status === 'completed' && (
                    <details className="mt-3">
                      <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                        View Results
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
               </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced Error Monitoring Section */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedView(!showAdvancedView)}
            >
              {showAdvancedView ? 'Hide' : 'Show'} Advanced Analytics
            </Button>
          </div>

          {showAdvancedView && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealtimeSimulationDashboard 
                userId={simulationResults.user?.id || 'demo'}
                isSimulating={isRunning}
                currentStep={currentStep.toString()}
              />
              <EnhancedErrorMonitor 
                errors={errorCollector}
                simulationRunning={isRunning}
                onClearErrors={() => setErrorCollector([])}
                onRetryFailedSteps={() => {
                  const failedSteps = steps.filter(s => s.status === 'error');
                  if (failedSteps.length > 0) {
                    toast.info(`Retrying ${failedSteps.length} failed steps...`);
                    setSteps(prev => prev.map(step => 
                      step.status === 'error' ? { ...step, status: 'pending', error: undefined } : step
                    ));
                  }
                }}
              />
            </div>
          )}

          {simulationComplete && errorCollector.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <Activity className="h-5 w-5" />
                  Error Analysis & Improvement Opportunities
                </CardTitle>
                <CardDescription>
                  Review errors encountered during simulation to identify areas for platform improvement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {errorCollector.filter(e => e.critical).length}
                    </div>
                    <div className="text-sm text-red-700">Critical Errors</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {errorCollector.filter(e => !e.critical).length}
                    </div>
                    <div className="text-sm text-orange-700">Minor Issues</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {steps.filter(s => s.status === 'completed').length}/{steps.length}
                    </div>
                    <div className="text-sm text-blue-700">Steps Completed</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Detailed Error Log:</h4>
                  {errorCollector.map((error, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      error.critical ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${error.critical ? 'text-red-800' : 'text-orange-800'}`}>
                          {error.step.replace('_', ' ').toUpperCase()}
                        </span>
                        <Badge variant={error.critical ? 'destructive' : 'secondary'}>
                          {error.critical ? 'Critical' : 'Minor'}
                        </Badge>
                      </div>
                      <p className={`text-sm ${error.critical ? 'text-red-700' : 'text-orange-700'}`}>
                        {error.error}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {simulationResults.finalReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Demo Account Summary Report
                </CardTitle>
                <CardDescription>
                  Complete overview of the demo account activities and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      UGX {simulationResults.finalReport.totalBalance?.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Wallet Balance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {simulationResults.finalReport.totalShares}
                    </div>
                    <div className="text-sm text-muted-foreground">Shares Owned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      UGX {simulationResults.finalReport.referralEarnings?.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Referral Earnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {simulationResults.finalReport.totalTransactions}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Transactions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserJourneySimulator;