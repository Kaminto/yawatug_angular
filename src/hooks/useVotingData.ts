import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VotingProposal {
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
  voting_options?: VotingOption[];
}

export interface VotingOption {
  id: string;
  option_text: string;
  vote_count?: number;
  vote_weight?: number;
}

export interface UserVotePower {
  total_shares: number;
  votes_cast: number;
  available_votes: number;
}

export const useVotingData = () => {
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [userVotePower, setUserVotePower] = useState<UserVotePower>({ 
    total_shares: 0, 
    votes_cast: 0, 
    available_votes: 0 
  });
  const [userVotes, setUserVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const loadVotingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load proposals with voting options and user votes
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

      // Load user's voting power using database function
      const { data: votingPowerData, error: votingPowerError } = await supabase
        .rpc('get_user_voting_power', { p_user_id: user.id });

      if (votingPowerError) throw votingPowerError;

      // Load user's votes
      const { data: userVotesData, error: userVotesError } = await supabase
        .from('user_votes')
        .select('*')
        .eq('user_id', user.id);

      if (userVotesError) throw userVotesError;

      const totalShares = votingPowerData || 0;
      const votesCount = userVotesData?.length || 0;
      const availableVotes = proposalsData?.filter(p => 
        p.status === 'active' && 
        !userVotesData?.some(v => v.proposal_id === p.id) &&
        totalShares >= p.minimum_shares_required
      ).length || 0;

      setProposals(proposalsData as any || []);
      setUserVotePower({
        total_shares: totalShares,
        votes_cast: votesCount,
        available_votes: availableVotes
      });
      setUserVotes(userVotesData || []);

    } catch (error) {
      console.error('Error loading voting data:', error);
      toast.error('Failed to load voting data');
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (proposalId: string, optionId: string, optionText: string) => {
    try {
      setVoting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the database function to cast vote with validation
      const { data, error } = await supabase
        .rpc('cast_vote', {
          p_proposal_id: proposalId,
          p_option_id: optionId,
          p_user_id: user.id
        });

      if (error) throw error;

      if (data && typeof data === 'object' && 'success' in data) {
        const result = data as { success: boolean; error?: string };
        if (result.success) {
          toast.success(`Vote cast: ${optionText}`);
          // Reload data to reflect the changes
          await loadVotingData();
          return true;
        } else {
          toast.error(result.error || 'Failed to cast vote');
          return false;
        }
      } else {
        toast.error('Invalid response from server');
        return false;
      }

    } catch (error) {
      console.error('Error casting vote:', error);
      toast.error('Failed to cast vote');
      return false;
    } finally {
      setVoting(false);
    }
  };

  const setupRealTimeUpdates = () => {
    // Subscribe to voting_proposals changes
    const proposalsChannel = supabase
      .channel('voting_proposals_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'voting_proposals' 
        },
        () => {
          loadVotingData();
        }
      )
      .subscribe();

    // Subscribe to user_votes changes
    const votesChannel = supabase
      .channel('user_votes_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_votes' 
        },
        () => {
          loadVotingData();
        }
      )
      .subscribe();

    // Subscribe to voting_options changes (for live vote counts)
    const optionsChannel = supabase
      .channel('voting_options_changes')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'voting_options' 
        },
        () => {
          loadVotingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(proposalsChannel);
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(optionsChannel);
    };
  };

  useEffect(() => {
    loadVotingData();
    const cleanup = setupRealTimeUpdates();
    
    return cleanup;
  }, []);

  return {
    proposals,
    userVotePower,
    userVotes,
    loading,
    voting,
    loadVotingData,
    castVote
  };
};