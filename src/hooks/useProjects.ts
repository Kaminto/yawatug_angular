import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MiningProject {
  id: string;
  name: string;
  description: string;
  location: string;
  project_type: string;
  target_funding: number;
  current_funding: number;
  expected_returns?: number;
  start_date?: string;
  expected_completion?: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Enhanced fields (optional for backward compatibility)
  currency?: string;
  expected_monthly_returns?: number;
  expected_start_date?: string;
  expected_completion_date?: string;
  actual_start_date?: string;
  actual_completion_date?: string;
  viability_score?: number;
  risk_assessment?: string;
  environmental_clearance?: boolean;
  government_approval?: boolean;
  approved_by?: string;
  approved_at?: string;
  metadata?: any;
}

export interface ProjectFundingStage {
  id: string;
  project_id: string;
  stage_number: number;
  stage_name: string;
  stage_amount: number;
  stage_description?: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  funding_status: 'pending' | 'approved' | 'funded' | 'disbursed' | 'completed';
  disbursement_date?: string;
  disbursed_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPerformance {
  id: string;
  project_id: string;
  reporting_period_start: string;
  reporting_period_end: string;
  actual_returns: number;
  expected_returns: number;
  variance_percentage?: number;
  production_volume?: number;
  operational_costs?: number;
  revenue?: number;
  profit_margin?: number;
  notes?: string;
  reported_by?: string;
  verified_by?: string;
  verification_status: 'pending' | 'verified' | 'disputed' | 'revised';
  created_at: string;
  updated_at: string;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<MiningProject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Try mining_projects first, fallback to mock data
      let data: MiningProject[] = [];
      
      try {
        const { data: projectsData, error } = await supabase
          .from('mining_projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        data = projectsData || [];
      } catch (dbError) {
        console.log('Mining projects table not ready, using mock data');
        // Fallback to mock data structure
        data = [
          {
            id: '1',
            name: 'Moyo Gold Mining Project',
            description: 'Large-scale gold mining operation in Moyo district with proven reserves of 5.2 million ounces. Expected to generate substantial returns through modern extraction techniques and sustainable mining practices.',
            location: 'Moyo District, Northern Uganda',
            project_type: 'gold_mining',
            target_funding: 3000000000,
            current_funding: 1300000000,
            expected_returns: 100000000,
            start_date: '2025-12-01',
            expected_completion: '2030-12-31',
            status: 'approved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Enhanced fields
            currency: 'UGX',
            expected_monthly_returns: 100000000,
            expected_start_date: '2025-12-01',
            expected_completion_date: '2030-12-31',
            viability_score: 85.5,
            environmental_clearance: true,
            government_approval: true,
          },
          {
            id: '2',
            name: 'Kasese Copper Expansion',
            description: 'Expansion of existing copper mining operations to increase production capacity by 40% with modern equipment and processing facilities.',
            location: 'Kasese, Western Uganda',
            project_type: 'copper_mining',
            target_funding: 1800000000,
            current_funding: 450000000,
            expected_returns: 60000000,
            start_date: '2024-06-01',
            expected_completion: '2026-08-31',
            status: 'funding',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Enhanced fields
            currency: 'UGX',
            expected_monthly_returns: 60000000,
            expected_start_date: '2024-06-01',
            expected_completion_date: '2026-08-31',
            viability_score: 78.2,
            environmental_clearance: true,
            government_approval: false,
          }
        ];
      }
      
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return {
    projects,
    loading,
    loadProjects
  };
};

export const useProjectStages = (projectId: string) => {
  const [stages, setStages] = useState<ProjectFundingStage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStages = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      // Mock stages data for now
      const mockStages: ProjectFundingStage[] = projectId === '1' ? [
        {
          id: '1',
          project_id: projectId,
          stage_number: 1,
          stage_name: 'Site Preparation & Infrastructure',
          stage_amount: 500000000,
          stage_description: 'Land acquisition, access roads, basic infrastructure setup',
          target_completion_date: '2025-06-01',
          funding_status: 'approved',
          disbursed_amount: 500000000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          project_id: projectId,
          stage_number: 2,
          stage_name: 'Equipment Procurement',
          stage_amount: 800000000,
          stage_description: 'Mining equipment, processing machinery, vehicles',
          target_completion_date: '2025-09-01',
          funding_status: 'approved',
          disbursed_amount: 800000000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          project_id: projectId,
          stage_number: 3,
          stage_name: 'Operational Setup',
          stage_amount: 700000000,
          stage_description: 'Staff hiring, training, operational systems',
          target_completion_date: '2025-11-01',
          funding_status: 'pending',
          disbursed_amount: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          project_id: projectId,
          stage_number: 4,
          stage_name: 'Production Commencement',
          stage_amount: 600000000,
          stage_description: 'Initial production setup, working capital',
          target_completion_date: '2025-12-01',
          funding_status: 'pending',
          disbursed_amount: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '5',
          project_id: projectId,
          stage_number: 5,
          stage_name: 'Expansion & Optimization',
          stage_amount: 400000000,
          stage_description: 'Production scaling, efficiency improvements',
          target_completion_date: '2026-06-01',
          funding_status: 'pending',
          disbursed_amount: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ] : [];
      
      setStages(mockStages);
    } catch (error) {
      console.error('Error loading project stages:', error);
      toast.error('Failed to load project stages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, [projectId]);

  return {
    stages,
    loading,
    loadStages
  };
};

export const useProjectPerformance = (projectId: string) => {
  const [performance, setPerformance] = useState<ProjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPerformance = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      // Mock performance data for Moyo Gold Project
      const mockPerformance: ProjectPerformance[] = projectId === '1' ? [
        {
          id: '1',
          project_id: projectId,
          reporting_period_start: '2024-01-01',
          reporting_period_end: '2024-01-31',
          actual_returns: 95000000,
          expected_returns: 100000000,
          variance_percentage: -5.0,
          production_volume: 15000,
          operational_costs: 25000000,
          revenue: 120000000,
          profit_margin: 79.2,
          notes: 'Slightly below target due to equipment calibration. Production efficiency improving.',
          verification_status: 'verified',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          project_id: projectId,
          reporting_period_start: '2024-02-01',
          reporting_period_end: '2024-02-29',
          actual_returns: 105000000,
          expected_returns: 100000000,
          variance_percentage: 5.0,
          production_volume: 16500,
          operational_costs: 23000000,
          revenue: 128000000,
          profit_margin: 82.0,
          notes: 'Exceeded expectations with optimized extraction processes.',
          verification_status: 'verified',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ] : [];
      
      setPerformance(mockPerformance);
    } catch (error) {
      console.error('Error loading project performance:', error);
      toast.error('Failed to load project performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, [projectId]);

  return {
    performance,
    loading,
    loadPerformance
  };
};