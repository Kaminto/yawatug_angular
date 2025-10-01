
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Target, MapPin, Calendar, DollarSign } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  targetFunding: number;
  currentFunding: number;
  expectedReturns: number;
  startDate: string;
  expectedCompletion: string;
  status: 'planning' | 'active' | 'completed';
}

const ProjectFunding = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pledgeAmounts, setPledgeAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // Mock data - would load from mining_projects table when created
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Karamoja Gold Mining Project',
          description: 'Exploration and development of gold deposits in the Karamoja region with estimated reserves of 2.5 million ounces.',
          location: 'Karamoja, Uganda',
          targetFunding: 50000000,
          currentFunding: 32000000,
          expectedReturns: 15,
          startDate: '2024-03-01',
          expectedCompletion: '2026-12-31',
          status: 'active'
        },
        {
          id: '2',
          name: 'Copper Mining Expansion',
          description: 'Expansion of existing copper mining operations to increase production capacity by 40%.',
          location: 'Kasese, Uganda',
          targetFunding: 25000000,
          currentFunding: 8500000,
          expectedReturns: 12,
          startDate: '2024-06-01',
          expectedCompletion: '2025-08-31',
          status: 'planning'
        }
      ];
      
      setProjects(mockProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitPledge = async (projectId: string) => {
    const amount = parseFloat(pledgeAmounts[projectId] || '0');
    
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      // This would submit to project_funding table when created
      toast.success('Pledge submitted successfully!');
      
      // Reset pledge amount
      setPledgeAmounts(prev => ({ ...prev, [projectId]: '' }));
      
      // Update project current funding
      setProjects(prev => prev.map(project =>
        project.id === projectId
          ? { ...project, currentFunding: project.currentFunding + amount }
          : project
      ));
    } catch (error) {
      console.error('Error submitting pledge:', error);
      toast.error('Failed to submit pledge');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Project Funding</h2>
        <Badge variant="outline">
          {projects.filter(p => p.status === 'active').length} Active Projects
        </Badge>
      </div>

      {projects.map((project) => {
        const fundingProgress = (project.currentFunding / project.targetFunding) * 100;
        
        return (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5" />
                    {project.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                </div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">{project.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="font-medium">Timeline</p>
                    <p className="text-muted-foreground">
                      {new Date(project.startDate).getFullYear()} - {new Date(project.expectedCompletion).getFullYear()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Expected Returns</p>
                    <p className="text-muted-foreground">{project.expectedReturns}% annually</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-muted-foreground capitalize">{project.status}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Funding Progress</span>
                  <span>
                    UGX {project.currentFunding.toLocaleString()} / {project.targetFunding.toLocaleString()}
                  </span>
                </div>
                <Progress value={fundingProgress} className="w-full" />
                <div className="text-right text-sm text-muted-foreground">
                  {fundingProgress.toFixed(1)}% funded
                </div>
              </div>

              {project.status === 'active' && (
                <div className="border-t pt-4">
                  <Label className="text-base font-medium mb-3 block">Make a Pledge</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Enter amount (UGX)"
                        value={pledgeAmounts[project.id] || ''}
                        onChange={(e) => 
                          setPledgeAmounts(prev => ({ ...prev, [project.id]: e.target.value }))
                        }
                      />
                    </div>
                    <Button 
                      onClick={() => submitPledge(project.id)}
                      disabled={!pledgeAmounts[project.id] || parseFloat(pledgeAmounts[project.id]) <= 0}
                    >
                      Pledge Funds
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Funds will be deducted from your wallet upon pledge confirmation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {projects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No funding projects available</p>
            <p className="text-sm text-muted-foreground">Check back later for investment opportunities</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectFunding;
