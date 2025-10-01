import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Footer from '@/components/layout/Footer';
import EnhancedProjectFunding from '@/components/projects/EnhancedProjectFunding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { FolderPlus, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    location: '',
    project_type: '',
    target_funding: '',
    expected_returns: '',
    start_date: '',
    expected_completion: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('mining_projects')
        .select(`
          *,
          creator:created_by (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create projects');
        return;
      }

      const { data, error } = await supabase
        .from('mining_projects')
        .insert({
          name: newProject.name,
          description: newProject.description,
          location: newProject.location,
          project_type: newProject.project_type,
          target_funding: Number(newProject.target_funding),
          start_date: newProject.start_date,
          expected_completion: newProject.expected_completion,
          status: 'pending_approval',
          created_by: user.id
        });

      if (error) throw error;

      toast.success('Project created successfully');
      setNewProject({
        name: '',
        description: '',
        location: '',
        project_type: '',
        target_funding: '',
        expected_returns: '',
        start_date: '',
        expected_completion: ''
      });
      loadProjects(); // Refresh the projects list
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminLayout title="Project Management">
        <main className="flex-grow container mx-auto px-4 pt-24 pb-16">
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
              <p className="text-muted-foreground">
                Manage mining projects and investment opportunities
              </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="overview">
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">View</span>
                </TabsTrigger>
                <TabsTrigger value="create">
                  <span className="hidden sm:inline">Create Project</span>
                  <span className="sm:hidden">Create</span>
                </TabsTrigger>
                <TabsTrigger value="funding">
                  <span className="hidden sm:inline">Funding</span>
                  <span className="sm:hidden">Fund</span>
                </TabsTrigger>
                <TabsTrigger value="updates">
                  <span className="hidden sm:inline">Updates</span>
                  <span className="sm:hidden">News</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <FolderPlus className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{projects.length}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {projects.filter(p => p.status === 'active').length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Funding Target</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          UGX {projects.reduce((sum, p) => sum + (p.target_funding || 0), 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                         <div className="text-2xl font-bold">
                           {projects.filter(p => p.status === 'pending_approval').length}
                         </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>All Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="text-center py-8">Loading projects...</div>
                      ) : projects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No projects found. Create your first project to get started.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Project Name</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Target Funding</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created By</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projects.map((project) => (
                              <TableRow key={project.id}>
                                <TableCell className="font-medium">{project.name}</TableCell>
                                <TableCell>{project.location}</TableCell>
                                <TableCell>{project.project_type?.replace('_', ' ')}</TableCell>
                                <TableCell>UGX {project.target_funding?.toLocaleString()}</TableCell>
                                <TableCell>
                                   <Badge variant={
                                     project.status === 'active' ? 'default' :
                                     project.status === 'pending_approval' ? 'secondary' :
                                     project.status === 'approved' ? 'default' : 'destructive'
                                   }>
                                    {project.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{project.creator?.full_name || 'Unknown'}</TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button size="sm" variant="outline">
                                      View
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      Edit
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                  
                  <EnhancedProjectFunding />
                </div>
              </TabsContent>

              <TabsContent value="create">
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Project</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Project Name</Label>
                          <Input
                            value={newProject.name}
                            onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <Label>Project Type</Label>
                          <Select 
                            value={newProject.project_type}
                            onValueChange={(value) => setNewProject({...newProject, project_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gold_mining">Gold Mining</SelectItem>
                              <SelectItem value="mineral_extraction">Mineral Extraction</SelectItem>
                              <SelectItem value="exploration">Exploration</SelectItem>
                              <SelectItem value="processing">Processing Facility</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newProject.description}
                          onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                          placeholder="Describe the project..."
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Location</Label>
                          <Input
                            value={newProject.location}
                            onChange={(e) => setNewProject({...newProject, location: e.target.value})}
                            placeholder="Project location"
                          />
                        </div>
                        <div>
                          <Label>Target Funding (UGX)</Label>
                          <Input
                            type="number"
                            value={newProject.target_funding}
                            onChange={(e) => setNewProject({...newProject, target_funding: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Expected Returns (%)</Label>
                          <Input
                            type="number"
                            value={newProject.expected_returns}
                            onChange={(e) => setNewProject({...newProject, expected_returns: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={newProject.start_date}
                            onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Expected Completion</Label>
                          <Input
                            type="date"
                            value={newProject.expected_completion}
                            onChange={(e) => setNewProject({...newProject, expected_completion: e.target.value})}
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" onClick={handleCreateProject}>
                        Create Project
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="funding">
                <Card>
                  <CardHeader>
                    <CardTitle>Funding Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Funding allocation and management features will be implemented here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="updates">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Updates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Project progress updates and communications will be managed here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </AdminLayout>
      <Footer />
    </div>
  );
};

export default AdminProjects;
