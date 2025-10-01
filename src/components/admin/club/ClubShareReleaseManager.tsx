import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Unlock, TrendingUp, BarChart3, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ClubShareAllocation, ClubShareHoldingAccount, ClubReleaseCriteriaSettings } from '@/interfaces/ClubShareInterfaces';

const ClubShareReleaseManager: React.FC = () => {
  const [holdingAccounts, setHoldingAccounts] = useState<ClubShareHoldingAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [releaseType, setReleaseType] = useState<'percentage' | 'absolute'>('percentage');
  const [releaseValue, setReleaseValue] = useState<number>(0);
  const [releaseReason, setReleaseReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isPhased, setIsPhased] = useState(false);
  const [phaseCount, setPhaseCount] = useState(2);
  const [phases, setPhases] = useState<{ percentage: number; date?: string }[]>([
    { percentage: 50 },
    { percentage: 50 }
  ]);
  const [criteriaSettings, setCriteriaSettings] = useState<ClubReleaseCriteriaSettings | null>(null);
  const [marketData, setMarketData] = useState({
    totalSharesForSale: 0,
    sharesSold: 0,
    releaseRatio: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load holding accounts
      const { data: holdings, error: holdingsError } = await supabase
        .from('club_share_holding_account')
        .select(`
          *,
          investment_club_members (
            id,
            member_name,
            email,
            phone
          ),
          club_share_allocations (
            id,
            allocation_status,
            allocated_shares
          )
        `)
        .eq('status', 'holding')
        .order('created_at', { ascending: false });

      if (holdingsError) throw holdingsError;
      setHoldingAccounts(holdings || []);

      // Load release criteria settings (disabled - table doesn't exist)
      // const { data: criteria, error: criteriaError } = await supabase
      //   .from('club_release_criteria_settings')
      //   .select('*')
      //   .eq('is_active', true)
      //   .single();

      // if (!criteriaError && criteria) {
      //   setCriteriaSettings(criteria);
      //   await calculateMarketData(criteria);
      // }
      
      // Use default criteria for now
      const defaultCriteria = {
        total_shares_for_sale: 1000000,
        release_percentage: 0.1
      };
      setCriteriaSettings(defaultCriteria as any);
      await calculateMarketData(defaultCriteria as any);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load release data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMarketData = async (criteria: ClubReleaseCriteriaSettings) => {
    try {
      // Get current shares data
      const { data: shares } = await supabase
        .from('shares')
        .select('total_shares, available_shares')
        .single();

      if (shares) {
        const totalForSale = criteria.total_shares_for_sale;
        const sharesSold = shares.total_shares - shares.available_shares;
        const releaseRatio = sharesSold / totalForSale;

        setMarketData({
          totalSharesForSale: totalForSale,
          sharesSold: sharesSold,
          releaseRatio: Math.min(releaseRatio, 1) // Cap at 100%
        });
      }
    } catch (error) {
      console.error('Error calculating market data:', error);
    }
  };

  const calculateEligibleRelease = (holdingAccount: ClubShareHoldingAccount) => {
    const remainingShares = holdingAccount.shares_remaining;
    const eligibleByRatio = Math.floor(remainingShares * marketData.releaseRatio);
    return Math.min(eligibleByRatio, remainingShares);
  };

  const handleAccountSelection = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts([...selectedAccounts, accountId]);
    } else {
      setSelectedAccounts(selectedAccounts.filter(id => id !== accountId));
    }
  };

  const processRelease = async () => {
    if (selectedAccounts.length === 0) {
      toast.error('Please select at least one holding account');
      return;
    }

    if (!releaseReason.trim()) {
      toast.error('Please provide a release reason');
      return;
    }

    if (!isPhased && releaseValue <= 0) {
      toast.error('Please enter a valid release value');
      return;
    }

    if (isPhased) {
      const totalPhasePercentage = phases.reduce((sum, phase) => sum + phase.percentage, 0);
      if (totalPhasePercentage !== 100) {
        toast.error('Phase percentages must total 100%');
        return;
      }
    }

    setProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const accountId of selectedAccounts) {
        try {
          const holdingAccount = holdingAccounts.find(acc => acc.id === accountId);
          if (!holdingAccount) continue;

          let sharesToRelease = 0;
          let phaseData = null;

          if (isPhased) {
            // For phased release, create schedule and release first phase immediately
            const firstPhase = phases[0];
            sharesToRelease = Math.floor((holdingAccount.shares_remaining * firstPhase.percentage) / 100);
            phaseData = {
              total_phases: phases.length,
              current_phase: 1,
              schedule: phases.map((phase, index) => ({
                phase: index + 1,
                percentage: phase.percentage,
                release_date: phase.date || null,
                status: index === 0 ? 'completed' : 'pending'
              }))
            };
          } else if (releaseType === 'percentage') {
            sharesToRelease = Math.floor((holdingAccount.shares_remaining * releaseValue) / 100);
          } else {
            sharesToRelease = Math.min(releaseValue, holdingAccount.shares_remaining);
          }

          if (sharesToRelease <= 0) continue;

          // Get the user_id from the club member
          const clubMember = holdingAccount.investment_club_members;
          if (!clubMember?.user_id) {
            console.error(`No user_id found for club member: ${clubMember?.member_name}. Skipping release for this member.`);
            toast.error(`Cannot release shares for ${clubMember?.member_name}: No linked user account found`);
            continue;
          }

          // Create user share holding
          const { data: userShareHolding, error: userShareError } = await supabase
            .from('user_shares')
            .insert({
              user_id: clubMember.user_id,
              share_id: '00000000-0000-0000-0000-000000000000', // Default share ID
              quantity: sharesToRelease,
              purchase_price_per_share: 0, // No purchase price for converted shares
              currency: 'UGX'
            })
            .select('id')
            .single();

          if (userShareError) throw userShareError;

          // Update holding account
          const { error: updateError } = await supabase
            .from('club_share_holding_account')
            .update({
              shares_released: holdingAccount.shares_released + sharesToRelease,
              status: (holdingAccount.shares_remaining - sharesToRelease) === 0 ? 'fully_released' : 'partially_released'
            })
            .eq('id', accountId);

          if (updateError) throw updateError;

          // Log the release
          const { error: logError } = await supabase
            .from('club_share_release_log')
            .insert({
              club_allocation_id: holdingAccount.club_allocation_id,
              club_holding_account_id: accountId,
              shares_released: sharesToRelease,
              release_percentage: (sharesToRelease / holdingAccount.shares_quantity) * 100,
              release_trigger: isPhased ? 'phased_release' : 'manual_admin',
              release_reason: isPhased ? `${releaseReason} (Phase 1 of ${phases.length})` : releaseReason,
              user_share_holding_id: userShareHolding.id,
              market_ratio_data: isPhased ? { ...marketData, phase_data: phaseData } : marketData
            });

          if (logError) throw logError;

          successCount++;
        } catch (error) {
          console.error(`Error processing account ${accountId}:`, error);
          errorCount++;
        }
      }

      toast.success(`Release completed: ${successCount} successful, ${errorCount} errors`);
      
      // Reset form and reload data
      setSelectedAccounts([]);
      setReleaseValue(0);
      setReleaseReason('');
      setIsPhased(false);
      setPhases([{ percentage: 50 }, { percentage: 50 }]);
      loadData();

    } catch (error) {
      console.error('Release processing error:', error);
      toast.error('Failed to process release');
    } finally {
      setProcessing(false);
    }
  };

  const getTotalSelectedShares = () => {
    return selectedAccounts.reduce((total, accountId) => {
      const account = holdingAccounts.find(acc => acc.id === accountId);
      return total + (account?.shares_remaining || 0);
    }, 0);
  };

  const calculateTotalRelease = () => {
    const totalSelectedShares = getTotalSelectedShares();
    if (isPhased) {
      const totalPhasePercentage = phases.reduce((sum, phase) => sum + phase.percentage, 0);
      return Math.floor((totalSelectedShares * totalPhasePercentage) / 100);
    }
    if (releaseType === 'percentage') {
      return Math.floor((totalSelectedShares * releaseValue) / 100);
    }
    return Math.min(releaseValue * selectedAccounts.length, totalSelectedShares);
  };

  const updatePhaseCount = (count: number) => {
    setPhaseCount(count);
    const newPhases = Array.from({ length: count }, (_, i) => ({
      percentage: Math.floor(100 / count),
      date: phases[i]?.date
    }));
    // Adjust last phase to make total 100%
    const totalPercentage = newPhases.reduce((sum, phase) => sum + phase.percentage, 0);
    if (totalPercentage !== 100 && newPhases.length > 0) {
      newPhases[newPhases.length - 1].percentage += (100 - totalPercentage);
    }
    setPhases(newPhases);
  };

  const updatePhasePercentage = (index: number, percentage: number) => {
    const newPhases = [...phases];
    newPhases[index].percentage = percentage;
    setPhases(newPhases);
  };

  const updatePhaseDate = (index: number, date: string) => {
    const newPhases = [...phases];
    newPhases[index].date = date;
    setPhases(newPhases);
  };

  if (loading) {
    return <div className="p-6">Loading release management...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Shares Sold</p>
                <p className="text-2xl font-bold">{marketData.sharesSold.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  of {marketData.totalSharesForSale.toLocaleString()} target
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Release Ratio</p>
                <p className="text-2xl font-bold">{(marketData.releaseRatio * 100).toFixed(1)}%</p>
                <Progress value={marketData.releaseRatio * 100} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Holding Accounts</p>
                <p className="text-2xl font-bold">{holdingAccounts.length}</p>
                <p className="text-xs text-muted-foreground">awaiting release</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Release Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Share Release Management
          </CardTitle>
          <CardDescription>
            Release shares from holding accounts based on market criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Checkbox
                id="phased-release"
                checked={isPhased}
                onCheckedChange={(checked) => setIsPhased(checked as boolean)}
              />
              <Label htmlFor="phased-release" className="font-medium">
                Enable Phased Release
              </Label>
            </div>

            {!isPhased ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="release-type">Release Type</Label>
                  <Select value={releaseType} onValueChange={(value: 'percentage' | 'absolute') => setReleaseType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="absolute">Absolute Quantity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="release-value">
                    {releaseType === 'percentage' ? 'Percentage (%)' : 'Shares per Account'}
                  </Label>
                  <Input
                    id="release-value"
                    type="number"
                    value={releaseValue}
                    onChange={(e) => setReleaseValue(Number(e.target.value))}
                    placeholder={releaseType === 'percentage' ? '25' : '1000'}
                    min="0"
                    max={releaseType === 'percentage' ? '100' : undefined}
                  />
                </div>

                <div>
                  <Label>Total Release Preview</Label>
                  <div className="p-2 bg-muted rounded-lg">
                    <span className="font-bold text-lg">
                      {calculateTotalRelease().toLocaleString()} shares
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phase-count">Number of Phases</Label>
                    <Select value={phaseCount.toString()} onValueChange={(value) => updatePhaseCount(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Phases</SelectItem>
                        <SelectItem value="3">3 Phases</SelectItem>
                        <SelectItem value="4">4 Phases</SelectItem>
                        <SelectItem value="5">5 Phases</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Total Release Preview</Label>
                    <div className="p-2 bg-muted rounded-lg">
                      <span className="font-bold text-lg">
                        {calculateTotalRelease().toLocaleString()} shares
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {phases.reduce((sum, phase) => sum + phase.percentage, 0)}% total
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Phase Configuration</Label>
                  {phases.map((phase, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm">Phase {index + 1}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={phase.percentage}
                            onChange={(e) => updatePhasePercentage(index, Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Release Date (Optional)</Label>
                        <Input
                          type="date"
                          value={phase.date || ''}
                          onChange={(e) => updatePhaseDate(index, e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Estimated Shares</Label>
                        <div className="p-2 bg-muted rounded text-sm">
                          {Math.floor((getTotalSelectedShares() * phase.percentage) / 100).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="release-reason">Release Reason</Label>
            <Textarea
              id="release-reason"
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="Describe the reason for this release..."
              rows={3}
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedAccounts.length} accounts selected • {getTotalSelectedShares().toLocaleString()} total shares
            </div>
            <Button 
              onClick={processRelease} 
              disabled={processing || selectedAccounts.length === 0}
              className="ml-auto"
            >
              {processing ? 'Processing...' : 'Release Shares'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Holding Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holding Accounts</CardTitle>
          <CardDescription>Select accounts for share release</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Total Shares</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Eligible Release</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdingAccounts.map((account) => {
                  const eligibleRelease = calculateEligibleRelease(account);
                  const releaseProgress = (account.shares_released / account.shares_quantity) * 100;
                  
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAccounts.includes(account.id)}
                          onCheckedChange={(checked) => handleAccountSelection(account.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {(account as any).investment_club_members?.member_name}
                      </TableCell>
                      <TableCell>{account.shares_quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <div>
                          <div>{account.shares_released.toLocaleString()}</div>
                          <Progress value={releaseProgress} className="w-16 h-2 mt-1" />
                        </div>
                      </TableCell>
                      <TableCell>{account.shares_remaining.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={eligibleRelease > 0 ? "default" : "secondary"}>
                          {eligibleRelease.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {account.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubShareReleaseManager;