import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CronStatus {
  job_exists: boolean;
  is_active: boolean;
  cron_expression: string;
  last_execution: string | null;
  execution_count: number;
  system_job_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAutoPricingCron = () => {
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCronStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_auto_pricing_cron_status');
      if (error) throw error;
      setCronStatus(data as unknown as CronStatus);
    } catch (error: any) {
      console.error('Error loading cron status:', error);
      toast.error('Failed to load cron status');
    } finally {
      setLoading(false);
    }
  };

  const manageCronJob = async (intervalHours: number, enabled: boolean) => {
    try {
      const { data, error } = await supabase.rpc('manage_auto_pricing_cron', {
        p_interval_hours: intervalHours,
        p_enabled: enabled
      });
      
      if (error) throw error;
      
      const result = data as any;
      if (result?.success) {
        toast.success(enabled ? 'Auto-pricing scheduled successfully' : 'Auto-pricing disabled');
        await loadCronStatus();
        return true;
      } else {
        throw new Error(result?.error || 'Failed to manage cron job');
      }
    } catch (error: any) {
      console.error('Error managing cron job:', error);
      toast.error(error.message);
      return false;
    }
  };

  const testPricingTrigger = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trigger-auto-pricing', {
        body: { manual_test: true }
      });
      
      if (error) throw error;
      
      toast.success('Auto pricing test triggered successfully');
      await loadCronStatus();
      return true;
    } catch (error: any) {
      console.error('Error testing trigger:', error);
      toast.error('Failed to test auto pricing trigger');
      return false;
    }
  };

  useEffect(() => {
    loadCronStatus();
  }, []);

  return {
    cronStatus,
    loading,
    loadCronStatus,
    manageCronJob,
    testPricingTrigger
  };
};