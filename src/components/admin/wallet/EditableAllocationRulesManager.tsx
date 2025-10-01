
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save } from 'lucide-react';

const EditableAllocationRulesManager = () => {
  const [rules, setRules] = useState({
    project_funding_percent: 0,
    buyback_percent: 0,
    admin_fund_percent: 0
  });
  const [loading, setLoading] = useState(false);
  const [adminWallets, setAdminWallets] = useState<any[]>([]);

  useEffect(() => {
    loadAllocationRules();
    loadAdminWallets();
  }, []);

  const loadAllocationRules = async () => {
    try {
      const { data, error } = await supabase
        .from('allocation_rules')
        .select('*')
        .limit(1)
        .single();

      if (data && !error) {
        setRules({
          project_funding_percent: data.project_funding_percent,
          buyback_percent: data.buyback_percent,
          admin_fund_percent: data.expenses_percent // Map expenses to admin fund
        });
      }
    } catch (error) {
      console.error('Error loading allocation rules:', error);
    }
  };

  const loadAdminWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_wallets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAdminWallets(data || []);
    } catch (error) {
      console.error('Error loading admin wallets:', error);
    }
  };

  const saveAllocationRules = async () => {
    try {
      setLoading(true);

      // Validate percentages add up to 100%
      const total = rules.project_funding_percent + rules.buyback_percent + rules.admin_fund_percent;
      if (total !== 100) {
        toast.error('Allocation percentages must add up to 100%');
        return;
      }

      // Check if rules exist
      const { data: existingRules } = await supabase
        .from('allocation_rules')
        .select('id')
        .limit(1)
        .single();

      if (existingRules) {
        // Update existing rules
        const { error } = await supabase
          .from('allocation_rules')
          .update({
            project_funding_percent: rules.project_funding_percent,
            buyback_percent: rules.buyback_percent,
            expenses_percent: rules.admin_fund_percent, // Map admin fund to expenses
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRules.id);

        if (error) throw error;
      } else {
        // Create new rules
        const { error } = await supabase
          .from('allocation_rules')
          .insert({
            project_funding_percent: rules.project_funding_percent,
            buyback_percent: rules.buyback_percent,
            expenses_percent: rules.admin_fund_percent
          });

        if (error) throw error;
      }

      // Ensure admin wallets exist for each currency
      const currencies = ['UGX', 'USD'];
      const walletTypes = ['project_funding', 'buyback', 'admin_fund'];
      
      for (const currency of currencies) {
        for (const walletType of walletTypes) {
          const exists = adminWallets.find(w => w.currency === currency && w.wallet_type === walletType);
          
          if (!exists) {
            await supabase
              .from('admin_wallets')
              .insert({
                wallet_type: walletType,
                currency: currency,
                balance: 0
              });
          }
        }
      }

      toast.success('Allocation rules saved successfully');
      loadAdminWallets(); // Reload to show new wallets
    } catch (error: any) {
      console.error('Error saving allocation rules:', error);
      toast.error(error.message || 'Failed to save allocation rules');
    } finally {
      setLoading(false);
    }
  };

  const totalPercentage = rules.project_funding_percent + rules.buyback_percent + rules.admin_fund_percent;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Allocation Rules Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Project Funding (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={rules.project_funding_percent}
                onChange={(e) => setRules({...rules, project_funding_percent: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label>Buyback Fund (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={rules.buyback_percent}
                onChange={(e) => setRules({...rules, buyback_percent: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label>Admin Fund (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={rules.admin_fund_percent}
                onChange={(e) => setRules({...rules, admin_fund_percent: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between">
              <span>Total Allocation:</span>
              <span className={totalPercentage === 100 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {totalPercentage}%
              </span>
            </div>
          </div>

          <Button onClick={saveAllocationRules} disabled={loading || totalPercentage !== 100} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : 'Save Allocation Rules'}
          </Button>
        </CardContent>
      </Card>

      {/* Admin Wallets Display */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Fund Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['project_funding', 'buyback', 'admin_fund'].map(walletType => (
              <div key={walletType} className="space-y-2">
                <h3 className="font-medium capitalize">{walletType.replace('_', ' ')} Wallets</h3>
                {['UGX', 'USD'].map(currency => {
                  const wallet = adminWallets.find(w => w.wallet_type === walletType && w.currency === currency);
                  return (
                    <div key={`${walletType}-${currency}`} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between">
                        <span>{currency}</span>
                        <span className="font-semibold">
                          {wallet ? wallet.balance.toLocaleString() : 'Not Created'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditableAllocationRulesManager;
