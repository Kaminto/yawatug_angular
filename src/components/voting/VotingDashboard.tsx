
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Users, Vote, AlertCircle, Smartphone, Timer, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVotingData, VotingProposal } from '@/hooks/useVotingData';
import VotingNotification from './VotingNotification';

const VotingDashboard = () => {
  const {
    proposals,
    userVotePower,
    userVotes,
    loading,
    voting,
    castVote
  } = useVotingData();
  
  const [activeTab, setActiveTab] = useState('active');

  const handleVote = async (proposalId: string, optionId: string, optionText: string) => {
    await castVote(proposalId, optionId, optionText);
  };

  const scrollToProposal = (proposalId: string) => {
    const element = document.getElementById(`proposal-${proposalId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getVotingStatus = (proposal: VotingProposal) => {
    const now = new Date();
    const startDate = new Date(proposal.start_date);
    const endDate = new Date(proposal.end_date);

    if (now < startDate) return 'pending';
    if (now > endDate) return 'closed';
    if (proposal.status === 'active') return 'active';
    return proposal.status;
  };

  const canUserVote = (proposal: VotingProposal) => {
    const status = getVotingStatus(proposal);
    const hasEnoughShares = userVotePower.total_shares >= proposal.minimum_shares_required;
    const hasVoted = userVotes.some(vote => vote.proposal_id === proposal.id);
    
    return status === 'active' && hasEnoughShares && !hasVoted;
  };

  const filteredProposals = proposals.filter(proposal => {
    const status = getVotingStatus(proposal);
    if (activeTab === 'active') return status === 'active';
    if (activeTab === 'pending') return status === 'pending';
    if (activeTab === 'closed') return status === 'closed';
    return true;
  });

  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Voting ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days remaining`;
    return `${hours} hours remaining`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Real-time Voting Notifications */}
      <VotingNotification 
        proposals={proposals}
        userVotePower={userVotePower}
        onVoteNow={scrollToProposal}
      />
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Smartphone className="h-5 w-5 md:hidden" />
            <Users className="h-5 w-5 hidden md:block" />
            Your Voting Power
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-2xl md:text-3xl font-bold text-primary">{userVotePower.total_shares.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground font-medium">Shares Owned</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="text-2xl md:text-3xl font-bold text-green-600">{userVotePower.votes_cast}</div>
              <p className="text-sm text-muted-foreground font-medium">Votes Cast</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="text-2xl md:text-3xl font-bold text-blue-600">
                {userVotePower.available_votes}
              </div>
              <p className="text-sm text-muted-foreground font-medium">Available to Vote</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile-Optimized Voting Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-11 p-1">
          <TabsTrigger value="active" className="text-xs md:text-sm font-medium">
            <span className="hidden sm:inline">Active</span>
            <span className="sm:hidden">●</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs md:text-sm font-medium">
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">◯</span>
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-xs md:text-sm font-medium">
            <span className="hidden sm:inline">Closed</span>
            <span className="sm:hidden">✓</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs md:text-sm font-medium">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredProposals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <Vote className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No proposals found</h3>
                <p className="text-muted-foreground">Check back later for new voting opportunities</p>
              </CardContent>
            </Card>
          ) : (
            filteredProposals.map((proposal) => {
              const status = getVotingStatus(proposal);
              const canVote = canUserVote(proposal);
              const hasVoted = userVotes.some(vote => vote.proposal_id === proposal.id);
              const userVote = userVotes.find(vote => vote.proposal_id === proposal.id);
              const totalVotes = userVotes.filter(vote => vote.proposal_id === proposal.id).length;
              const totalWeight = 0; // We'll calculate this from actual user shares later

              return (
                <Card key={proposal.id} id={`proposal-${proposal.id}`} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg md:text-xl font-semibold leading-tight">
                          {proposal.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {proposal.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                        <Badge 
                          variant={status === 'active' ? 'default' : status === 'pending' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {proposal.proposal_type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                        <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">Vote Options</span>
                          <div className="text-right">
                            <div className="font-medium">{totalVotes} total votes</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {proposal.voting_options && proposal.voting_options
                            .map((option, index) => {
                              const isUserChoice = userVote?.option_id === option.id;
                              
                              return (
                                <div key={option.id} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{option.option_text}</span>
                                      {isUserChoice && (
                                        <Badge variant="secondary" className="text-xs">Your Vote</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full">
                                    <div className={`h-full rounded-full transition-all duration-500 ${
                                      isUserChoice ? 'bg-primary' : 'bg-muted-foreground/20'
                                    }`} style={{ width: isUserChoice ? '100%' : '0%' }} />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                    {/* Proposal Details - Mobile Optimized */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min. Shares:</span>
                          <span className="font-medium">{proposal.minimum_shares_required.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quorum:</span>
                          <span className="font-medium">{proposal.quorum_percentage}%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ends:</span>
                          <span className="font-medium text-right">{getTimeRemaining(proposal.end_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span className="font-medium">{new Date(proposal.start_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Voting Actions - Mobile First */}
                    {status === 'active' && (
                      <div className="space-y-4">
                        {!canVote && userVotePower.total_shares < proposal.minimum_shares_required && (
                          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-orange-700">
                              You need at least {proposal.minimum_shares_required.toLocaleString()} shares to vote. You currently have {userVotePower.total_shares.toLocaleString()} shares.
                            </p>
                          </div>
                        )}
                        
                        {hasVoted && (
                          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <span className="text-sm text-green-700 font-medium">
                              You have voted on this proposal
                            </span>
                          </div>
                        )}
                        
                        {canVote && proposal.voting_options && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">Cast your vote:</p>
                            <div className="grid gap-3">
                              {proposal.voting_options
                                .map((option, index) => (
                                  <Button
                                    key={option.id}
                                    onClick={() => handleVote(proposal.id, option.id, option.option_text)}
                                    disabled={voting}
                                    className="w-full h-auto py-4 px-6 text-left justify-start"
                                    variant={option.option_text.toLowerCase().includes('yes') || option.option_text.toLowerCase().includes('approve') ? 'default' : 'outline'}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-medium">{option.option_text}</span>
                                      <Vote className="h-4 w-4 opacity-60" />
                                    </div>
                                  </Button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {status === 'pending' && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Clock3 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-blue-700 font-medium">Voting starts soon</p>
                          <p className="text-xs text-blue-600">
                            {new Date(proposal.start_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {status === 'closed' && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <Timer className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-700 font-medium">Voting has ended</p>
                          <p className="text-xs text-gray-600">
                            Ended on {new Date(proposal.end_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VotingDashboard;
