import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  location: string;
  project_type: string;
  target_funding: number;
  current_funding?: number;
  expected_returns?: number;
  start_date?: string;
  expected_completion?: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  creator?: {
    full_name: string;
    email: string;
  } | null;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  totalFundingTarget: number;
  pendingApproval: number;
  completedProjects: number;
  totalCurrentFunding: number;
}

export const useProjectsData = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalFundingTarget: 0,
    pendingApproval: 0,
    completedProjects: 0,
    totalCurrentFunding: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: projectsError } = await supabase
        .from('mining_projects')
        .select(`
          *,
          creator:created_by (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsData = data || [];
      setProjects(projectsData as any);

      // Calculate stats
      const totalFundingTarget = projectsData.reduce((sum, p) => sum + (p.target_funding || 0), 0);
      const totalCurrentFunding = projectsData.reduce((sum, p) => sum + (p.current_funding || 0), 0);
      const activeProjects = projectsData.filter(p => p.status === 'active').length;
      const pendingApproval = projectsData.filter(p => p.status === 'pending').length;
      const completedProjects = projectsData.filter(p => p.status === 'completed').length;

      setStats({
        totalProjects: projectsData.length,
        activeProjects,
        totalFundingTarget,
        pendingApproval,
        completedProjects,
        totalCurrentFunding
      });

    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Failed to load projects');
      toast.error('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: Omit<ProjectData, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'creator'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mining_projects')
        .insert({
          ...projectData,
          created_by: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Project created successfully');
      await loadProjects();
      return data;
    } catch (err: any) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project');
      throw err;
    }
  };

  const updateProjectStatus = async (projectId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('mining_projects')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      toast.success(`Project status updated to ${status}`);
      await loadProjects();
    } catch (err: any) {
      console.error('Error updating project status:', err);
      toast.error('Failed to update project status');
      throw err;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('mining_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Project deleted successfully');
      await loadProjects();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
      throw err;
    }
  };

  useEffect(() => {
    loadProjects();

    // Set up real-time subscription
    const projectsChannel = supabase
      .channel('mining_projects_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mining_projects' },
        () => loadProjects())
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
    };
  }, []);

  return {
    projects,
    stats,
    loading,
    error,
    loadProjects,
    createProject,
    updateProjectStatus,
    deleteProject
  };
};