import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardMetrics {
  total_users: number;
  pending_verifications: number;
  active_users: number;
  imported_users: number;
  blocked_users: number;
  new_registrations_week: number;
}

interface PriorityAction {
  id: string;
  full_name: string;
  email: string;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  hours_waiting: number;
  profile_completion_percentage: number;
}

export const useOptimizedDashboardData = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [priorityActions, setPriorityActions] = useState<PriorityAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load optimized dashboard metrics from view
      const { data: metricsData, error: metricsError } = await supabase
        .from('admin_dashboard_metrics')
        .select('*')
        .single();

      if (metricsError) {
        console.warn('Failed to load from optimized view, falling back to profiles table');
        // Fallback to direct query if view doesn't exist yet
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, status, import_batch_id, created_at');

        if (profilesError) throw profilesError;

        const fallbackMetrics: DashboardMetrics = {
          total_users: profilesData?.length || 0,
          pending_verifications: profilesData?.filter(p => p.status === 'pending_verification').length || 0,
          active_users: profilesData?.filter(p => p.status === 'active').length || 0,
          imported_users: profilesData?.filter(p => p.import_batch_id).length || 0,
          blocked_users: profilesData?.filter(p => p.status === 'blocked').length || 0,
          new_registrations_week: profilesData?.filter(p => 
            new Date(p.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && 
            !p.import_batch_id
          ).length || 0
        };
        setMetrics(fallbackMetrics);
      } else {
        setMetrics(metricsData);
      }

      // Load priority actions from verification queue view
      const { data: actionsData, error: actionsError } = await supabase
        .from('verification_priority_queue')
        .select('*')
        .limit(10);

      if (actionsError) {
        console.warn('Failed to load from priority queue view, falling back to direct query');
        // Fallback to direct query
        const { data: fallbackActions, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, full_name, email, verification_submitted_at, profile_completion_percentage')
          .eq('status', 'pending_verification')
          .order('verification_submitted_at', { ascending: true })
          .limit(10);

        if (!fallbackError && fallbackActions) {
          const processedActions: PriorityAction[] = fallbackActions.map(action => ({
            id: action.id,
            full_name: action.full_name,
            email: action.email,
            profile_completion_percentage: action.profile_completion_percentage,
            hours_waiting: action.verification_submitted_at 
              ? Math.floor((Date.now() - new Date(action.verification_submitted_at).getTime()) / (1000 * 60 * 60))
              : 0,
            priority_level: (action.verification_submitted_at 
              ? (new Date(action.verification_submitted_at) < new Date(Date.now() - 48 * 60 * 60 * 1000) 
                  ? 'critical' 
                  : new Date(action.verification_submitted_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
                    ? 'high' 
                    : 'medium') 
              : 'low') as 'critical' | 'high' | 'medium' | 'low'
          }));
          setPriorityActions(processedActions);
        }
      } else {
        // Process actionsData to match PriorityAction interface
        const processedActionsData: PriorityAction[] = (actionsData || []).map(action => ({
          id: action.id,
          full_name: action.full_name,
          email: action.email,
          priority_level: action.priority_level as 'critical' | 'high' | 'medium' | 'low',
          hours_waiting: action.hours_waiting || 0,
          profile_completion_percentage: action.profile_completion_percentage || 0
        }));
        setPriorityActions(processedActionsData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Refresh every 60 seconds for real-time updates
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    priorityActions,
    loading,
    error,
    refresh: loadDashboardData
  };
};