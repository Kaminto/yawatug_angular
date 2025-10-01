import React from 'react';
import { Bell, Vote, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VotingProposal } from '@/hooks/useVotingData';

interface VotingNotificationProps {
  proposals: VotingProposal[];
  userVotePower: { total_shares: number; votes_cast: number; available_votes: number };
  onVoteNow?: (proposalId: string) => void;
}

export const VotingNotification: React.FC<VotingNotificationProps> = ({
  proposals,
  userVotePower,
  onVoteNow
}) => {
  const getNotifications = () => {
    const notifications = [];
    const now = new Date();

    // Active proposals user can vote on
    const availableVotes = proposals.filter(p => {
      const status = p.status === 'active' && 
        now >= new Date(p.start_date) && 
        now <= new Date(p.end_date);
      return status && userVotePower.total_shares >= p.minimum_shares_required;
    });

    if (availableVotes.length > 0) {
      notifications.push({
        type: 'action_required',
        icon: Vote,
        title: `${availableVotes.length} Active Vote${availableVotes.length > 1 ? 's' : ''}`,
        message: `You have ${availableVotes.length} proposal${availableVotes.length > 1 ? 's' : ''} awaiting your vote`,
        action: 'Vote Now',
        proposalId: availableVotes[0].id
      });
    }

    // Proposals starting soon
    const upcomingVotes = proposals.filter(p => {
      const startDate = new Date(p.start_date);
      const timeDiff = startDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      return p.status === 'pending' && hoursDiff <= 24 && hoursDiff > 0;
    });

    if (upcomingVotes.length > 0) {
      const nextVote = upcomingVotes[0];
      const startDate = new Date(nextVote.start_date);
      const hours = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      notifications.push({
        type: 'upcoming',
        icon: Clock,
        title: 'Upcoming Vote',
        message: `"${nextVote.title}" voting starts in ${hours} hour${hours > 1 ? 's' : ''}`,
        action: 'View Details',
        proposalId: nextVote.id
      });
    }

    // Proposals ending soon
    const endingSoon = proposals.filter(p => {
      if (p.status !== 'active') return false;
      const endDate = new Date(p.end_date);
      const timeDiff = endDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      return hoursDiff <= 24 && hoursDiff > 0;
    });

    if (endingSoon.length > 0) {
      const endingVote = endingSoon[0];
      const endDate = new Date(endingVote.end_date);
      const hours = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      notifications.push({
        type: 'urgent',
        icon: AlertTriangle,
        title: 'Voting Ends Soon',
        message: `"${endingVote.title}" voting ends in ${hours} hour${hours > 1 ? 's' : ''}`,
        action: 'Vote Now',
        proposalId: endingVote.id
      });
    }

    // Recent voting activity
    if (userVotePower.votes_cast > 0) {
      notifications.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Recent Activity',
        message: `You've participated in ${userVotePower.votes_cast} vote${userVotePower.votes_cast > 1 ? 's' : ''} recently`,
        action: null
      });
    }

    return notifications.slice(0, 3); // Limit to 3 notifications
  };

  const notifications = getNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">Voting Updates</h3>
        </div>
        
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const IconComponent = notification.icon;
            return (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <div className={`p-2 rounded-full ${
                  notification.type === 'action_required' ? 'bg-primary/10 text-primary' :
                  notification.type === 'urgent' ? 'bg-red-100 text-red-600' :
                  notification.type === 'upcoming' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <Badge 
                      variant={notification.type === 'urgent' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {notification.type === 'action_required' ? 'Action Required' :
                       notification.type === 'urgent' ? 'Urgent' :
                       notification.type === 'upcoming' ? 'Upcoming' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>
                
                {notification.action && onVoteNow && (
                  <Button
                    size="sm"
                    variant={notification.type === 'urgent' ? 'default' : 'outline'}
                    onClick={() => onVoteNow(notification.proposalId!)}
                    className="shrink-0"
                  >
                    {notification.action}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default VotingNotification;