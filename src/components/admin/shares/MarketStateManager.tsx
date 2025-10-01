import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Settings, TrendingUp } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const MarketStateManager: React.FC = () => {
  const { currentState, loading, updateMarketState } = useMarketState();
  const [selectedState, setSelectedState] = useState<string>('');
  const [changeReason, setChangeReason] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const getStateVariant = (state: string) => {
    switch (state) {
      case 'company_primary': return 'secondary';
      case 'mixed_market': return 'default';
      case 'full_p2p': return 'destructive';
      default: return 'outline';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'company_primary': return 'Company Primary';
      case 'mixed_market': return 'Mixed Market';
      case 'full_p2p': return 'Full P2P';
      default: return state;
    }
  };

  const getStateDescription = (state: string) => {
    switch (state) {
      case 'company_primary': return 'Company sells shares directly to buyers with priority routing';
      case 'mixed_market': return 'Both company and P2P trading available with smart routing';
      case 'full_p2p': return 'Peer-to-peer trading only, company not actively selling';
      default: return '';
    }
  };

  const handleStateChange = async () => {
    if (!selectedState) return;
    
    try {
      setIsChanging(true);
      await updateMarketState(selectedState, changeReason || undefined);
      setSelectedState('');
      setChangeReason('');
    } finally {
      setIsChanging(false);
    }
  };

  const getScheduleDisplay = (scheduleRules: any) => {
    if (!scheduleRules) return 'No schedule configured';
    
    const rules = scheduleRules;
    if (rules.weekdays) {
      const weekdayRule = Object.values(rules.weekdays)[0];
      const weekendRule = rules.weekends ? Object.values(rules.weekends)[0] : 'mixed_market';
      return `Weekdays: ${getStateLabel(weekdayRule as string)}, Weekends: ${getStateLabel(weekendRule as string)}`;
    }
    
    return 'Custom schedule';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current State Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>Current Market State</CardTitle>
            </div>
            {currentState && (
              <Badge variant={getStateVariant(currentState.state_type)}>
                {getStateLabel(currentState.state_type)}
              </Badge>
            )}
          </div>
          <CardDescription>
            {currentState ? getStateDescription(currentState.state_type) : 'No active market state configured'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentState && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Configuration</Label>
                <p className="text-sm text-muted-foreground">{currentState.config_name}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">P2P Trading</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={currentState.p2p_enabled} disabled />
                  <span className="text-sm">{currentState.p2p_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Auto-Buyback</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={currentState.auto_buyback_enabled} disabled />
                  <span className="text-sm">{currentState.auto_buyback_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Priority</Label>
                <p className="text-sm text-muted-foreground">{currentState.company_priority_percentage}%</p>
              </div>
              
              {currentState.schedule_enabled && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Schedule
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {getScheduleDisplay(currentState.schedule_rules)}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change State */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Change Market State</CardTitle>
          </div>
          <CardDescription>
            Manually override the current market state configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-state">New Market State</Label>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger id="new-state">
                <SelectValue placeholder="Select new market state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company_primary">
                  <div>
                    <div className="font-medium">Company Primary</div>
                    <div className="text-sm text-muted-foreground">Startup phase - company sells directly</div>
                  </div>
                </SelectItem>
                <SelectItem value="mixed_market">
                  <div>
                    <div className="font-medium">Mixed Market</div>
                    <div className="text-sm text-muted-foreground">Company + P2P trading available</div>
                  </div>
                </SelectItem>
                <SelectItem value="full_p2p">
                  <div>
                    <div className="font-medium">Full P2P</div>
                    <div className="text-sm text-muted-foreground">Only peer-to-peer trading</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-reason">Change Reason (Optional)</Label>
            <Textarea
              id="change-reason"
              placeholder="Describe why you're changing the market state..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                disabled={!selectedState || isChanging}
                className="w-full"
              >
                {isChanging ? 'Changing State...' : 'Change Market State'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Market State Change
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to change the market state from{' '}
                  <strong>{currentState ? getStateLabel(currentState.state_type) : 'Unknown'}</strong> to{' '}
                  <strong>{getStateLabel(selectedState)}</strong>.
                  {'\n\n'}
                  This will affect how users can buy and sell shares. Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStateChange}>
                  Confirm Change
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketStateManager;