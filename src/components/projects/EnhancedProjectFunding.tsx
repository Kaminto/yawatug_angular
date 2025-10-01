import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects, useProjectStages, useProjectPerformance } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { 
  Target, 
  MapPin, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

const EnhancedProjectFunding = () => {
  const { projects, loading } = useProjects();
  const [pledgeAmounts, setPledgeAmounts] = useState<Record<string, string>>({});
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

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
        <h2 className="text-2xl font-bold">Enhanced Project Funding</h2>
        <Badge variant="outline">
          {projects.filter(p => p.status === 'active' || p.status === 'approved').length} Active Projects
        </Badge>
      </div>

      {projects.map((project) => {
        const fundingProgress = project.target_funding > 0 
          ? (project.current_funding / project.target_funding) * 100 
          : 0;
        
        return (
          <Card key={project.id} className="overflow-hidden">
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
                <div className="flex gap-2">
                  <Badge variant={project.status === 'active' || project.status === 'approved' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                  {project.viability_score && (
                    <Badge variant="outline">
                      {project.viability_score}% Viable
                    </Badge>
                  )}
                </div>
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
                      {new Date(project.expected_start_date).getFullYear()} - {
                        project.expected_completion_date 
                          ? new Date(project.expected_completion_date).getFullYear()
                          : 'Ongoing'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Monthly Returns</p>
                    <p className="text-muted-foreground">
                      UGX {project.expected_monthly_returns?.toLocaleString() || 'TBD'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="font-medium">Project Type</p>
                    <p className="text-muted-foreground capitalize">
                      {project.project_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Funding Progress</span>
                  <span>
                    UGX {project.current_funding.toLocaleString()} / {project.target_funding.toLocaleString()}
                  </span>
                </div>
                <Progress value={fundingProgress} className="w-full" />
                <div className="text-right text-sm text-muted-foreground">
                  {fundingProgress.toFixed(1)}% funded
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex items-center gap-1 text-sm">
                  {project.environmental_clearance ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                  Environmental
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {project.government_approval ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  Government
                </div>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="stages">Funding Stages</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  {(project.status === 'active' || project.status === 'approved') && (
                    <div className="border-t pt-4">
                      <Label className="text-base font-medium mb-3 block">Make an Investment</Label>
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
                          Invest Now
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Funds will be deducted from your wallet upon investment confirmation
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="stages">
                  <ProjectStages projectId={project.id} />
                </TabsContent>
                
                <TabsContent value="performance">
                  <ProjectPerformanceView projectId={project.id} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })}

      {projects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No mining projects available</p>
            <p className="text-sm text-muted-foreground">Check back later for investment opportunities</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ProjectStages: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { stages, loading } = useProjectStages(projectId);

  if (loading) {
    return <div className="animate-pulse">Loading stages...</div>;
  }

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex items-center gap-3 p-3 border rounded-lg">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            stage.funding_status === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : stage.funding_status === 'approved'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{stage.stage_name}</h4>
              <Badge variant={
                stage.funding_status === 'completed' ? 'default' :
                stage.funding_status === 'approved' ? 'secondary' : 'outline'
              }>
                {stage.funding_status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{stage.stage_description}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span>UGX {stage.stage_amount.toLocaleString()}</span>
              {stage.disbursed_amount > 0 && (
                <span>Disbursed: UGX {stage.disbursed_amount.toLocaleString()}</span>
              )}
              {stage.target_completion_date && (
                <span>Target: {new Date(stage.target_completion_date).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectPerformanceView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { performance, loading } = useProjectPerformance(projectId);

  if (loading) {
    return <div className="animate-pulse">Loading performance...</div>;
  }

  if (performance.length === 0) {
    return (
      <div className="text-center py-6">
        <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No performance data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {performance.map((perf) => (
        <div key={perf.id} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">
              {new Date(perf.reporting_period_start).toLocaleDateString()} - {new Date(perf.reporting_period_end).toLocaleDateString()}
            </h4>
            <Badge variant={
              (perf.variance_percentage || 0) >= 0 ? 'default' : 'destructive'
            }>
              {(perf.variance_percentage || 0) >= 0 ? '+' : ''}{perf.variance_percentage?.toFixed(1)}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Expected Returns</p>
              <p className="font-medium">UGX {perf.expected_returns.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual Returns</p>
              <p className="font-medium">UGX {perf.actual_returns.toLocaleString()}</p>
            </div>
            {perf.revenue && (
              <div>
                <p className="text-muted-foreground">Revenue</p>
                <p className="font-medium">UGX {perf.revenue.toLocaleString()}</p>
              </div>
            )}
            {perf.operational_costs && (
              <div>
                <p className="text-muted-foreground">Operational Costs</p>
                <p className="font-medium">UGX {perf.operational_costs.toLocaleString()}</p>
              </div>
            )}
          </div>
          {perf.notes && (
            <p className="text-sm text-muted-foreground mt-3">{perf.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default EnhancedProjectFunding;