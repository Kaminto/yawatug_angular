import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  component: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
}

const SettingsValidationPanel: React.FC = () => {
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    validateAllSettings();
    
    // Listen for settings updates
    const handleSettingsUpdate = () => {
      setTimeout(validateAllSettings, 1000); // Delay to ensure updates are processed
    };
    
    window.addEventListener('settingsUpdate' as any, handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdate' as any, handleSettingsUpdate);
  }, []);

  const validateAllSettings = async () => {
    setLoading(true);
    const results: ValidationResult[] = [];

    try {
      // Validate fund allocation rules
      const { data: allocationRules } = await supabase
        .from('allocation_rules')
        .select('*')
        .eq('is_active', true);

      if (!allocationRules?.length) {
        results.push({
          component: 'Fund Allocation',
          status: 'error',
          message: 'No active fund allocation rules found'
        });
      } else {
        const rule = allocationRules[0];
        const total = rule.project_funding_percent + rule.expenses_percent + rule.buyback_percent;
        if (total !== 100) {
          results.push({
            component: 'Fund Allocation',
            status: 'error',
            message: `Allocation percentages total ${total}% instead of 100%`
          });
        } else {
          results.push({
            component: 'Fund Allocation',
            status: 'valid',
            message: 'Allocation rules properly configured'
          });
        }
      }

      // Validate trade limits
      const { data: buyingLimits } = await supabase
        .from('share_buying_limits')
        .select('*');

      const { data: sellingLimits } = await supabase
        .from('share_selling_limits_by_account')
        .select('*')
        .eq('is_active', true);

      const { data: transferLimits } = await supabase
        .from('share_transfer_limits_by_account')
        .select('*')
        .eq('is_active', true);

      if (!buyingLimits?.length || !sellingLimits?.length || !transferLimits?.length) {
        results.push({
          component: 'Trade Limits',
          status: 'warning',
          message: 'Some account types missing limit configurations'
        });
      } else {
        results.push({
          component: 'Trade Limits',
          status: 'valid',
          message: 'All trade limits properly configured'
        });
      }

      // Validate pricing settings
      const { data: shares } = await supabase
        .from('shares')
        .select('price_per_share, current_price')
        .single();

      if (shares) {
        if (!shares.current_price || shares.current_price <= 0) {
          results.push({
            component: 'Pricing',
            status: 'error',
            message: 'Invalid current share price'
          });
        } else {
          results.push({
            component: 'Pricing',
            status: 'valid',
            message: 'Pricing system operational'
          });
        }
      }

    } catch (error) {
      results.push({
        component: 'System',
        status: 'error',
        message: 'Failed to validate settings'
      });
    }

    setValidations(results);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Settings className="h-6 w-6 animate-spin" />
            <span className="ml-2">Validating settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const errorCount = validations.filter(v => v.status === 'error').length;
  const warningCount = validations.filter(v => v.status === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings Validation
          <div className="flex gap-2 ml-auto">
            {errorCount > 0 && (
              <Badge variant="destructive">{errorCount} Error{errorCount !== 1 ? 's' : ''}</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary">{warningCount} Warning{warningCount !== 1 ? 's' : ''}</Badge>
            )}
            {errorCount === 0 && warningCount === 0 && (
              <Badge variant="default">All Valid</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {validations.map((validation, index) => (
          <Alert key={index} className={getStatusColor(validation.status)}>
            <div className="flex items-center gap-2">
              {getStatusIcon(validation.status)}
              <div className="flex-1">
                <div className="font-medium">{validation.component}</div>
                <AlertDescription className="text-sm">
                  {validation.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}

        {validations.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No validation results available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SettingsValidationPanel;