import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Crown, 
  TrendingUp, 
  Target, 
  Gift,
  Share2,
  Copy,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ClubMember {
  id: string;
  name: string;
  avatar?: string;
  investmentAmount: number;
  joinedAt: string;
  status: 'active' | 'pending';
}

interface InvestmentClub {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  totalInvestment: number;
  averageReturn: number;
  minimumInvestment: number;
  category: string;
  perks: string[];
  members: ClubMember[];
}

interface InvestmentClubInviteProps {
  userReferrals?: number;
  userInvestmentLevel?: 'beginner' | 'intermediate' | 'advanced';
}

const InvestmentClubInvite: React.FC<InvestmentClubInviteProps> = ({ 
  userReferrals = 2,
  userInvestmentLevel = 'beginner'
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  // Sample investment clubs
  const investmentClubs: InvestmentClub[] = [
    {
      id: 'gold_miners',
      name: 'Gold Miners Elite',
      description: 'Exclusive club for serious gold mining investors',
      memberCount: 47,
      maxMembers: 50,
      totalInvestment: 2500000000,
      averageReturn: 15.2,
      minimumInvestment: 500000,
      category: 'Premium',
      perks: ['Priority mining access', 'Exclusive updates', 'Lower fees', 'VIP support'],
      members: [
        { id: '1', name: 'Sarah K.', investmentAmount: 2000000, joinedAt: '2024-01-15', status: 'active' },
        { id: '2', name: 'James M.', investmentAmount: 1500000, joinedAt: '2024-02-20', status: 'active' },
        { id: '3', name: 'Alice N.', investmentAmount: 800000, joinedAt: '2024-03-10', status: 'pending' }
      ]
    },
    {
      id: 'smart_starters',
      name: 'Smart Starters',
      description: 'Perfect for new investors getting started',
      memberCount: 156,
      maxMembers: 200,
      totalInvestment: 500000000,
      averageReturn: 12.8,
      minimumInvestment: 50000,
      category: 'Beginner',
      perks: ['Learning resources', 'Mentorship', 'Group challenges', 'Regular tips'],
      members: [
        { id: '4', name: 'Peter L.', investmentAmount: 150000, joinedAt: '2024-03-01', status: 'active' },
        { id: '5', name: 'Grace W.', investmentAmount: 75000, joinedAt: '2024-03-15', status: 'active' }
      ]
    },
    {
      id: 'social_investors',
      name: 'Social Investors',
      description: 'Community-focused investment group',
      memberCount: 89,
      maxMembers: 100,
      totalInvestment: 1200000000,
      averageReturn: 13.5,
      minimumInvestment: 200000,
      category: 'Community',
      perks: ['Social challenges', 'Group investments', 'Referral bonuses', 'Community events'],
      members: [
        { id: '6', name: 'David R.', investmentAmount: 500000, joinedAt: '2024-02-01', status: 'active' },
        { id: '7', name: 'Mary S.', investmentAmount: 300000, joinedAt: '2024-02-10', status: 'active' }
      ]
    }
  ];

  const recommendedClubs = investmentClubs.filter(club => {
    if (userInvestmentLevel === 'beginner') return club.category === 'Beginner' || club.category === 'Community';
    if (userInvestmentLevel === 'intermediate') return club.category === 'Community' || club.category === 'Premium';
    return club.category === 'Premium';
  });

  const referralCode = 'YAW-FB-2024-USR';

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleJoinClub = (clubId: string) => {
    setSelectedClub(clubId);
    toast.success('Club invitation sent! We\'ll notify you once approved.');
  };

  const handleInviteFriends = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Yawatu Investment Club',
        text: `Join me on Yawatu and start investing in gold mining! Use my code: ${referralCode}`,
        url: `https://yawatug.com/register-new?ref=${referralCode}`
      });
    } else {
      handleCopyReferralCode();
    }
  };

  return (
    <div className="space-y-6">
      {/* Referral Progress */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-primary" />
            Invite Friends & Unlock Clubs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Referral Progress</p>
              <p className="text-xs text-muted-foreground">
                {userReferrals} of 5 friends referred
              </p>
            </div>
            <Badge variant="secondary">{userReferrals}/5</Badge>
          </div>
          
          <Progress value={(userReferrals / 5) * 100} className="h-2" />
          
          <div className="flex gap-2">
            <Button 
              onClick={handleInviteFriends}
              className="flex-1"
              size="sm"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Invite Friends
            </Button>
            
            <Button 
              onClick={handleCopyReferralCode}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {copiedCode ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-mono text-center">{referralCode}</p>
          </div>
        </CardContent>
      </Card>

      {/* Investment Clubs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Investment Clubs</h3>
          <Badge variant="secondary">Recommended</Badge>
        </div>

        <div className="grid gap-4">
          {recommendedClubs.map((club) => (
            <Card key={club.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {club.category === 'Premium' && <Crown className="w-4 h-4 text-yellow-500" />}
                      {club.name}
                      <Badge variant="outline">
                        {club.category}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {club.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-primary">{club.memberCount}</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">{club.averageReturn}%</p>
                    <p className="text-xs text-muted-foreground">Avg Return</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">UGX {(club.minimumInvestment / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">Min Investment</p>
                  </div>
                </div>

                {/* Members Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Club Capacity</span>
                    <span>{club.memberCount}/{club.maxMembers}</span>
                  </div>
                  <Progress value={(club.memberCount / club.maxMembers) * 100} className="h-2" />
                </div>

                {/* Perks */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Gift className="w-4 h-4" />
                    Club Perks
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {club.perks.slice(0, 3).map((perk, index) => (
                      <Badge key={index} variant="secondary">
                        {perk}
                      </Badge>
                    ))}
                    {club.perks.length > 3 && (
                      <Badge variant="outline">
                        +{club.perks.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Recent Members */}
                <div>
                  <p className="text-sm font-medium mb-2">Recent Members</p>
                  <div className="flex -space-x-2">
                    {club.members.slice(0, 4).map((member, index) => (
                      <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {club.memberCount > 4 && (
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-medium">+{club.memberCount - 4}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => handleJoinClub(club.id)}
                  disabled={selectedClub === club.id}
                  className="w-full"
                  size="sm"
                >
                  {selectedClub === club.id ? 'Request Sent' : 'Request to Join'}
                  <Target className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Social Challenge */}
      <Card className="bg-gradient-to-r from-green-500/5 to-blue-500/5 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">March Investment Challenge</p>
              <p className="text-xs text-muted-foreground">
                Invest UGX 100K this month and win bonus shares!
              </p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentClubInvite;