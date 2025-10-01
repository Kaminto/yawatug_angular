
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, TrendingUp, Wallet, Target } from 'lucide-react';

interface AllocationRule {
  id?: string;
  project_funding_percent: number;
  admin_fund_percent: number;
  buyback_percent: number;
}

interface AdminWalletAllocationManagerProps {
  onUpdate?: () => void;
}

const AdminWalletAllocationManager: React.FC<AdminWalletAllocationManagerProps> = ({ onUpdate }) => {
  const [rules, setRules] = useState<AllocationRule>({
    project_funding_percent: 60,
    admin_fund_percent: 20,
    buyback_percent: 20
  });
  const [loading, setLoading] = useState(false);
  const [subWallets, setSubWallets] = useState<any[]>([]);

  useEffect(() => {
    loadAllocationRules();
    loadSubWallets();
  }, []);

  const loadAllocationRules = async () => {
    try {
      const { data, error } = await supabase
        .from('allocation_rules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setRules({
          project_funding_percent: data.project_funding_percent,
          admin_fund_percent: data.expenses_percent, // Map expenses to admin fund
          buyback_percent: data.buyback_percent
        });
      }
    } catch (error) {
      console.error('Error loading allocation rules:', error);
    }
  };

  const loadSubWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('*')
        .order('wallet_type');

      if (error) throw error;
      setSubWallets(data || []);
    } catch (error) {
      console.error('Error loading sub wallets:', error);
    }
  };

  const saveAllocationRules = async () => {
    const total = rules.project_funding_percent + rules.admin_fund_percent + rules.buyback_percent;
    
    if (total !== 100) {
      toast.error('Allocation percentages must add up to 100%');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('allocation_rules')
        .insert({
          project_funding_percent: rules.project_funding_percent,
          expenses_percent: rules.admin_fund_percent, // Map admin fund to expenses
          buyback_percent: rules.buyback_percent
        });

      if (error) throw error;

      // Ensure sub-wallets exist for each currency and type
      const walletTypes = ['project_funding', 'admin_fund', 'share_buyback_fund'];
      const currencies = ['UGX', 'USD'];

      for (const currency of currencies) {
        for (const walletType of walletTypes) {
          const exists = subWallets.find(w => w.currency === currency && w.wallet_type === walletType);
          
          if (!exists) {
            await supabase
              .from('admin_sub_wallets')
              .insert({
                wallet_name: `${walletType.replace('_', ' ')} - ${currency}`,
                wallet_type: walletType,
                currency: currency,
                balance: 0,
                description: `${currency} wallet for ${walletType.replace('_', ' ')}`
              });
          }
        }
      }

      toast.success('Allocation rules saved successfully');
      loadSubWallets();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving allocation rules:', error);
      toast.error('Failed to save allocation rules');
    } finally {
      setLoading(false);
    }
  };

  const getWalletsByType = (type: string) => {
    return subWallets.filter(w => w.wallet_type === type);
  };

  const getTotalByType = (type: string) => {
    return getWalletsByType(type).reduce((sum, wallet) => sum + Number(wallet.balance), 0);
  };

  const totalPercentage = rules.project_funding_percent + rules.admin_fund_percent + rules.buyback_percent;

  return (
    <div className="space-y-6">
      {/* Allocation Rules Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Fund Allocation Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">How Fund Allocation Works</h3>
            <p className="text-sm text-muted-foreground">
              When users purchase shares, payments are automatically distributed across three sub-accounts 
              based on the percentages set below. Transaction fees are directly allocated to the Admin Fund.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Project Funding (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={rules.project_funding_percent}
                onChange={(e) => setRules({
                  ...rules, 
                  project_funding_percent: Number(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Funds for project investments and development
              </p>
            </div>

            <div>
              <Label>Admin Fund (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={rules.admin_fund_percent}
                onChange={(e) => setRules({
                  ...rules, 
                  admin_fund_percent: Number(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Operations, fees, commissions, and expenses
              </p>
            </div>

            <div>
              <Label>Buyback Fund (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={rules.buyback_percent}
                onChange={(e) => setRules({
                  ...rules, 
                  buyback_percent: Number(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Share buyback operations and liquidity
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="font-medium">Total Allocation:</span>
            <span className={`text-lg font-bold ${
              totalPercentage === 100 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalPercentage}%
            </span>
          </div>

          <Button 
            onClick={saveAllocationRules} 
            disabled={loading || totalPercentage !== 100}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : 'Save Allocation Rules'}
          </Button>
        </CardContent>
      </Card>

      {/* Sub-Wallets Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sub-Wallet Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Project Funding */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Project Funding</h3>
              </div>
              <div className="space-y-2">
                {getWalletsByType('project_funding').map(wallet => (
                  <div key={wallet.id} className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-800">{wallet.currency}</span>
                      <span className="font-semibold text-blue-800">
                        {wallet.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Total (UGX equiv.)</span>
                    <span className="font-bold text-blue-600">
                      {getTotalByType('project_funding').toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Fund */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Admin Fund</h3>
              </div>
              <div className="space-y-2">
                {getWalletsByType('admin_fund').map(wallet => (
                  <div key={wallet.id} className="bg-green-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-800">{wallet.currency}</span>
                      <span className="font-semibold text-green-800">
                        {wallet.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Total (UGX equiv.)</span>
                    <span className="font-bold text-green-600">
                      {getTotalByType('admin_fund').toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyback Fund */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">Buyback Fund</h3>
              </div>
              <div className="space-y-2">
                {getWalletsByType('share_buyback_fund').map(wallet => (
                  <div key={wallet.id} className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-800">{wallet.currency}</span>
                      <span className="font-semibold text-purple-800">
                        {wallet.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Total (UGX equiv.)</span>
                    <span className="font-bold text-purple-600">
                      {getTotalByType('share_buyback_fund').toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fund Flow Information */}
      <Card>
        <CardHeader>
          <CardTitle>Fund Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">Project Funding</h3>
              <div className="space-y-1 text-sm">
                <div className="text-green-600">+ Share sales allocation ({rules.project_funding_percent}%)</div>
                <div className="text-green-600">+ Project cash returns</div>
                <Separator className="my-2" />
                <div className="text-red-600">- Project investments</div>
                <div className="text-red-600">- Project expenses</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-green-600 mb-2">Admin Fund</h3>
              <div className="space-y-1 text-sm">
                <div className="text-green-600">+ Share sales allocation ({rules.admin_fund_percent}%)</div>
                <div className="text-green-600">+ Transaction fees</div>
                <Separator className="my-2" />
                <div className="text-red-600">- Referral commissions</div>
                <div className="text-red-600">- Admin expenses</div>
                <div className="text-red-600">- Staff payments</div>
                <div className="text-red-600">- Promotional costs</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-purple-600 mb-2">Buyback Fund</h3>
              <div className="space-y-1 text-sm">
                <div className="text-green-600">+ Share sales allocation ({rules.buyback_percent}%)</div>
                <Separator className="my-2" />
                <div className="text-red-600">- Share buyback payments</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWalletAllocationManager;
