
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  project_type: string;
  status: string;
  target_funding: number;
  current_funding: number;
  start_date: string;
  expected_completion: string;
  expected_returns: number;
}

const PublicProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('mining_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'planning': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return target > 0 ? (current / target) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white">
        <Navbar />
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="animate-pulse text-center">Loading projects...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'active');
  const plannedProjects = projects.filter(p => p.status === 'planning');

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-black to-yawatu-black-light">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="gold-text">Mining Projects</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Discover the mining projects that power your investment returns. 
                From active gold extraction to upcoming coltan ventures, see where your shares create value.
              </p>
            </div>
          </div>
        </section>

        {/* Active Projects */}
        <section className="py-20 bg-yawatu-black-light">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12">
              <span className="gold-text">Active Projects</span>
            </h2>
            
            {activeProjects.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeProjects.map((project) => (
                  <Card key={project.id} className="bg-black/50 border-yawatu-gold/20">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-yawatu-gold">{project.name}</CardTitle>
                        <Badge variant={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-300">{project.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="h-4 w-4" />
                          {project.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          Started: {new Date(project.start_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <TrendingUp className="h-4 w-4" />
                          Expected Returns: {project.expected_returns}%
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Funding Progress</span>
                          <span>{calculateProgress(project.current_funding, project.target_funding).toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={calculateProgress(project.current_funding, project.target_funding)} 
                          className="h-2" 
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>UGX {project.current_funding.toLocaleString()}</span>
                          <span>UGX {project.target_funding.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-black/50 border-yawatu-gold/20 text-center py-12">
                <CardContent>
                  <p className="text-gray-400">No active projects at the moment. Check back soon!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Planned Projects */}
        <section className="py-20 bg-black">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12">
              <span className="gold-text">Coming Soon</span>
            </h2>
            
            {plannedProjects.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plannedProjects.map((project) => (
                  <Card key={project.id} className="bg-black/50 border-yawatu-gold/20 opacity-75">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-yawatu-gold">{project.name}</CardTitle>
                        <Badge variant="secondary">Planning</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-300">{project.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="h-4 w-4" />
                          {project.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <DollarSign className="h-4 w-4" />
                          Target Funding: UGX {project.target_funding.toLocaleString()}
                        </div>
                        {project.expected_returns && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <TrendingUp className="h-4 w-4" />
                            Expected Returns: {project.expected_returns}%
                          </div>
                        )}
                      </div>

                      <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-3">
                        <p className="text-yawatu-gold text-sm font-medium">
                          Project in planning phase - details coming soon
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-black/50 border-yawatu-gold/20 text-center py-12">
                <CardContent>
                  <p className="text-gray-400">No planned projects to announce yet. Stay tuned!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Investment Impact */}
        <section className="py-20 bg-gradient-to-b from-yawatu-black-light to-black">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6">
                Your <span className="gold-text">Investment Impact</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Every share you own contributes directly to these mining projects. 
                As projects generate profits, shareholders benefit through dividends and share value appreciation.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yawatu-gold mb-2">Direct</div>
                  <p className="text-gray-400">Project funding from share sales</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yawatu-gold mb-2">Transparent</div>
                  <p className="text-gray-400">Regular project updates for all shareholders</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yawatu-gold mb-2">Profitable</div>
                  <p className="text-gray-400">Share in mining profits through dividends</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PublicProjects;
