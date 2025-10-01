import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Vote, 
  AlertTriangle, 
  Eye,
  Play,
  Pause,
  RotateCcw,
  Ban
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProposalCreationForm from './ProposalCreationForm';

interface VotingProposal {
  id: string;
  title: string;
  description: string;
  proposal_type: string;
  status: string;
  start_date: string;
  end_date: string;
  minimum_shares_required: number;
  quorum_percentage: number;
  created_at: string;
  created_by: string;
  voting_options: VotingOption[];
}

interface VotingOption {
  id: string;
  option_text: string;
  option_order?: number;
  vote_count?: number;
  vote_weight?: number;
}

interface VotingStats {
  total_proposals: number;
  active_proposals: number;
  total_participants: number;
  average_participation: number;
}

const AdminVotingDashboard: React.FC = () => {
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [stats, setStats] = useState<VotingStats>({
    total_proposals: 0,
    active_proposals: 0,
    total_participants: 0,
    average_participation: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadVotingData();
  }, []);

  const loadVotingData = async () => {
    try {
      setLoading(true);

      // Load proposals with voting options
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('voting_proposals')
        .select(`
          *,
          voting_options (
            id,
            option_text
          )
        `)
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;

      // Calculate stats
      const totalProposals = proposalsData?.length || 0;
      const activeProposals = proposalsData?.filter(p => p.status === 'active').length || 0;
      
      // Get unique voters count
      const { data: votersData } = await supabase
        .from('user_votes')
        .select('user_id')
        .not('user_id', 'is', null);

      const uniqueVoters = new Set(votersData?.map(v => v.user_id)).size;

      // Calculate average participation (simplified)
      const avgParticipation = totalProposals > 0 ? (uniqueVoters / totalProposals) * 100 : 0;

      setProposals(proposalsData || []);
      setStats({
        total_proposals: totalProposals,
        active_proposals: activeProposals,
        total_participants: uniqueVoters,
        average_participation: Math.round(avgParticipation)
      });

    } catch (error) {
      console.error('Error loading voting data:', error);
      toast.error('Failed to load voting data');
    } finally {
      setLoading(false);
    }
  };

  const updateProposalStatus = async (proposalId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('voting_proposals')
        .update({ status: newStatus })
        .eq('id', proposalId);

      if (error) throw error;

      toast.success(`Proposal ${newStatus} successfully`);
      loadVotingData();
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast.error('Failed to update proposal status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'closed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getQuorumProgress = (proposal: VotingProposal) => {
    const totalWeight = proposal.voting_options?.reduce((sum, opt) => sum + (opt.vote_weight || 0), 0) || 0;
    // This is simplified - in reality you'd need total outstanding shares
    const estimatedTotalShares = 10000; // Should come from database
    const quorumTarget = (proposal.quorum_percentage / 100) * estimatedTotalShares;
    return Math.min((totalWeight / quorumTarget) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_proposals}</div>
            <p className="text-xs text-muted-foreground">All time proposals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_proposals}</div>
            <p className="text-xs text-muted-foreground">Currently accepting votes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_participants}</div>
            <p className="text-xs text-muted-foreground">Unique voters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Participation</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.average_participation}%</div>
            <p className="text-xs text-muted-foreground">Across all proposals</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create Proposal</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {proposals.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Vote className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-2">No proposals found</h3>
                    <p>Create your first voting proposal to get started</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => {
                const totalVotes = proposal.voting_options?.reduce((sum, opt) => sum + (opt.vote_count || 0), 0) || 0;
                const totalWeight = proposal.voting_options?.reduce((sum, opt) => sum + (opt.vote_weight || 0), 0) || 0;
                const quorumProgress = getQuorumProgress(proposal);

                return (
                  <Card key={proposal.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{proposal.title}</CardTitle>
                          <CardDescription>{proposal.description}</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(proposal.status)}>
                            {proposal.status}
                          </Badge>
                          <Badge variant="outline">{proposal.proposal_type}</Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Voting Results */}
                      {proposal.voting_options && proposal.voting_options.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Results</span>
                            <span>{totalVotes} votes • {totalWeight.toLocaleString()} voting power</span>
                          </div>

                           <div className="space-y-2">
                             {proposal.voting_options
                               .sort((a, b) => (a.option_order || 0) - (b.option_order || 0))
                               .map((option) => {
                                 const percentage = totalWeight > 0 ? ((option.vote_weight || 0) / totalWeight) * 100 : 0;
                                 return (
                                   <div key={option.id} className="space-y-1">
                                     <div className="flex justify-between text-sm">
                                       <span className="font-medium">{option.option_text}</span>
                                       <span className="text-muted-foreground">
                                         {option.vote_count || 0} votes ({percentage.toFixed(1)}%)
                                       </span>
                                     </div>
                                     <Progress value={percentage} className="h-2" />
                                   </div>
                                 );
                               })}
                          </div>

                          {/* Quorum Progress */}
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Quorum Progress</span>
                              <span>{quorumProgress.toFixed(1)}% of {proposal.quorum_percentage}% required</span>
                            </div>
                            <Progress value={quorumProgress} className="h-2" />
                          </div>
                        </div>
                      )}

                      {/* Proposal Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                        <div>
                          <p className="text-muted-foreground">Voting Period</p>
                          <p>{new Date(proposal.start_date).toLocaleDateString()} - {new Date(proposal.end_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Min. Shares Required</p>
                          <p>{proposal.minimum_shares_required.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex space-x-2 pt-4 border-t">
                        {proposal.status === 'draft' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateProposalStatus(proposal.id, 'active')}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </Button>
                        )}
                        
                        {proposal.status === 'active' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateProposalStatus(proposal.id, 'closed')}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Close Voting
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateProposalStatus(proposal.id, 'cancelled')}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </>
                        )}

                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <ProposalCreationForm onProposalCreated={loadVotingData} />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Management</CardTitle>
              <CardDescription>
                Manage existing proposals, update statuses, and configure settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Advanced management features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voting Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and insights about voting patterns and participation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Advanced analytics features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminVotingDashboard;