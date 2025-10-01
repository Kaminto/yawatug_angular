import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { DebtConversionConsentForm } from './DebtConversionConsentForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClubMember {
  id: string;
  member_name: string;
  member_code: string;
  net_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  status: string;
}

export const InvestmentClubDashboard: React.FC = () => {
  const [clubMember, setClubMember] = useState<ClubMember | null>(null);
  const [conversionAgreements, setConversionAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConversionForm, setShowConversionForm] = useState(false);

  useEffect(() => {
    loadClubData();
  }, []);

  const loadClubData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Load club member data
      const { data: memberData, error: memberError } = await supabase
        .from('investment_club_members')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      setClubMember(memberData);

      // Load conversion agreements if member exists
      if (memberData) {
        const { data: agreements, error: agreementsError } = await supabase
          .from('debt_conversion_agreements')
          .select('*')
          .eq('club_member_id', memberData.id)
          .order('created_at', { ascending: false });

        if (agreementsError) throw agreementsError;
        setConversionAgreements(agreements || []);
      }
    } catch (error) {
      console.error('Error loading club data:', error);
      toast.error('Failed to load investment club data');
    } finally {
      setLoading(false);
    }
  };

  const handleConversionComplete = () => {
    setShowConversionForm(false);
    loadClubData(); // Refresh data after conversion
    toast.success('Debt conversion completed successfully!');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!clubMember) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Club</CardTitle>
          <CardDescription>
            You are not currently a member of the investment club
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contact the administrator to join the investment club and start managing your investments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{clubMember.member_code}</p>
                <p className="text-xs text-muted-foreground">Member Code</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{formatCurrency(clubMember.total_deposits)}</p>
                <p className="text-xs text-muted-foreground">Total Deposits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{formatCurrency(clubMember.total_withdrawals)}</p>
                <p className="text-xs text-muted-foreground">Total Withdrawals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{formatCurrency(clubMember.net_balance)}</p>
                <p className="text-xs text-muted-foreground">Net Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversion">Debt Conversion</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
              <CardDescription>Your investment club membership details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg">{clubMember.member_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge variant={clubMember.status === 'active' ? 'default' : 'secondary'}>
                      {clubMember.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Balance</label>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(clubMember.net_balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          {clubMember.net_balance > 0 ? (
            <>
              {!showConversionForm ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Debt to Share Conversion</CardTitle>
                    <CardDescription>
                      Convert your outstanding debt balance to company shares
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span>Available for Conversion:</span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(clubMember.net_balance)}
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => setShowConversionForm(true)} className="w-full">
                      Start Conversion Process
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <DebtConversionConsentForm
                  clubMember={clubMember}
                  onConversionComplete={handleConversionComplete}
                />
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Debt Available for Conversion</CardTitle>
                <CardDescription>
                  You currently have no outstanding debt balance to convert to shares
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your current net balance is {formatCurrency(clubMember.net_balance)}. 
                  Only positive balances can be converted to shares.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion History</CardTitle>
              <CardDescription>Your debt to share conversion history</CardDescription>
            </CardHeader>
            <CardContent>
              {conversionAgreements.length > 0 ? (
                <div className="space-y-4">
                  {conversionAgreements.map((agreement) => (
                    <div key={agreement.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {formatCurrency(agreement.debt_amount)} → {agreement.shares_to_receive} shares
                        </span>
                        <Badge variant={agreement.converted ? 'default' : 'secondary'}>
                          {agreement.converted ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Rate: {formatCurrency(agreement.conversion_rate)} per share</div>
                        <div>Date: {formatDate(agreement.created_at)}</div>
                        {agreement.consent_given && (
                          <div>Consent: Given on {formatDate(agreement.consent_given_at)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No conversion history found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};