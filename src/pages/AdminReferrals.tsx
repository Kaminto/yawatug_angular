import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Footer from '@/components/layout/Footer';
import { Users, DollarSign, TrendingUp, Gift, Search, Award, Target, Calendar, Settings, Save, Edit, X } from 'lucide-react';

const AdminReferrals = () => {
  const [referralStatistics, setReferralStatistics] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [referralSettings, setReferralSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editCommissionRate, setEditCommissionRate] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    activeUsers: 0,
    topTier: 'bronze' as string,
    avgCommissionRate: 0
  });

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      // Load referral statistics with user info
      const { data: statsData, error: statsError } = await supabase
        .from('referral_statistics')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            phone
          )
        `)
        .order('total_earnings', { ascending: false });

      if (statsError) throw statsError;
      setReferralStatistics(statsData || []);

      // Load referral activities with referrer and referred info
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('referral_activities')
        .select(`
          *,
          referrer:referrer_id (
            full_name,
            email
          ),
          referred:referred_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load referral programs
      const { data: programsData, error: programsError } = await supabase
        .from('referral_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Load referral campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('referral_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('referral_milestones')
        .select('*')
        .order('threshold_value', { ascending: true });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);

      // Load referral settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('referral_settings')
        .select('*')
        .order('setting_name');

      if (settingsError) throw settingsError;
      setReferralSettings(settingsData || []);

      // Calculate aggregate stats
      const totalEarnings = statsData?.reduce((sum, s) => sum + (s.total_earnings || 0), 0) || 0;
      const pendingEarnings = statsData?.reduce((sum, s) => sum + (s.pending_earnings || 0), 0) || 0;
      const totalReferrals = statsData?.reduce((sum, s) => sum + (s.total_referrals || 0), 0) || 0;
      const activeUsers = statsData?.filter(s => s.total_referrals > 0).length || 0;
      
      // Since tier system was removed, use default values
      const tiers: string[] = [];
      const topTier = 'standard';

      // Calculate average commission rate from settings
      const baseRate = settingsData?.find(s => s.setting_name === 'base_commission_rate')?.setting_value || 0.05;
      const avgCommissionRate = baseRate;

      setStats({
        totalReferrals,
        totalEarnings,
        pendingEarnings,
        activeUsers,
        topTier,
        avgCommissionRate
      });

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const updateActivityStatus = async (activityId: string, status: 'paid' | 'processed' | 'cancelled') => {
    try {
      const updateData: any = { status };
      if (status === 'paid') {
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('referral_activities')
        .update(updateData)
        .eq('id', activityId);

      if (error) throw error;

      toast.success(`Activity marked as ${status}`);
      loadReferralData();

    } catch (error) {
      console.error('Error updating activity status:', error);
      toast.error('Failed to update activity status');
    }
  };

  const toggleProgramStatus = async (programId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('referral_programs')
        .update({ is_active: !isActive })
        .eq('id', programId);

      if (error) throw error;

      toast.success(`Program ${!isActive ? 'activated' : 'deactivated'}`);
      loadReferralData();

    } catch (error) {
      console.error('Error updating program status:', error);
      toast.error('Failed to update program status');
    }
  };

  const updateReferralSetting = async (settingId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('referral_settings')
        .update({ 
          setting_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingId);

      if (error) throw error;

      toast.success('Commission setting updated successfully');
      loadReferralData();

    } catch (error) {
      console.error('Error updating referral setting:', error);
      toast.error('Failed to update commission setting');
    }
  };

  const toggleCommissionEnabled = async (enabled: boolean) => {
    try {
      const setting = referralSettings.find(s => s.setting_name === 'commission_enabled');
      if (!setting) return;

      const { error } = await supabase
        .from('referral_settings')
        .update({ 
          setting_value: enabled ? 1 : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', setting.id);

      if (error) throw error;

      toast.success(`Referral commissions ${enabled ? 'enabled' : 'disabled'}`);
      loadReferralData();

    } catch (error) {
      console.error('Error toggling commission status:', error);
      toast.error('Failed to update commission status');
    }
  };

  const filteredStatistics = referralStatistics.filter(stat => 
    stat.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stat.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stat.tier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivities = activities.filter(activity => 
    activity.referrer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.referrer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.referred?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminLayout title="Referral Management">
          <main className="flex-grow pt-20">
            <div className="container mx-auto px-4 py-12">
              <div className="animate-pulse">Loading referral data...</div>
            </div>
          </main>
        </AdminLayout>
        <Footer />
      </div>
    );
  }
  return (
    <div className="flex flex-col min-h-screen">
      <AdminLayout title="Referral Management">
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Referral Management</h1>
              <p className="text-muted-foreground">Monitor and manage the referral program</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                  <p className="text-xs text-muted-foreground">People referred</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">UGX {stats.totalEarnings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All time earnings</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">UGX {stats.pendingEarnings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Awaiting payment</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">With referrals</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Tier</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{stats.topTier}</div>
                  <p className="text-xs text-muted-foreground">Highest achieved</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats.avgCommissionRate * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Average rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users, emails, or codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>

            <Tabs defaultValue="statistics" className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="statistics">
                  <span className="hidden sm:inline">User Statistics</span>
                  <span className="sm:hidden">Users</span>
                </TabsTrigger>
                <TabsTrigger value="activities">
                  <span className="hidden sm:inline">Activities</span>
                  <span className="sm:hidden">Activity</span>
                </TabsTrigger>
                <TabsTrigger value="programs">
                  <span className="hidden sm:inline">Programs</span>
                  <span className="sm:hidden">Programs</span>
                </TabsTrigger>
                <TabsTrigger value="campaigns">
                  <span className="hidden sm:inline">Campaigns</span>
                  <span className="sm:hidden">Campaigns</span>
                </TabsTrigger>
                <TabsTrigger value="milestones">
                  <span className="hidden sm:inline">Milestones</span>
                  <span className="sm:hidden">Goals</span>
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <span className="hidden sm:inline">Settings</span>
                  <span className="sm:hidden">Settings</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="statistics">
                <Card>
                  <CardHeader>
                    <CardTitle>User Referral Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Total Referrals</TableHead>
                          <TableHead>Successful</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>Last Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStatistics.map((stat) => (
                          <TableRow key={stat.id}>
                            <TableCell className="font-medium">
                              {stat.profiles?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>{stat.profiles?.email || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                stat.tier === 'platinum' ? 'default' :
                                stat.tier === 'gold' ? 'secondary' :
                                stat.tier === 'silver' ? 'outline' : 'destructive'
                              }>
                                {stat.tier.charAt(0).toUpperCase() + stat.tier.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{stat.total_referrals}</TableCell>
                            <TableCell>{stat.successful_referrals}</TableCell>
                            <TableCell>UGX {(stat.total_earnings || 0).toLocaleString()}</TableCell>
                            <TableCell>UGX {(stat.pending_earnings || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              {stat.last_activity_at ? new Date(stat.last_activity_at).toLocaleDateString() : 'Never'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activities">
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Referred User</TableHead>
                          <TableHead>Investment</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActivities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell>
                              {new Date(activity.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {activity.activity_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {activity.referrer?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {activity.referred?.full_name || activity.activity_type === 'tier_upgrade' ? 'N/A' : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {activity.investment_amount ? `UGX ${activity.investment_amount.toLocaleString()}` : 'N/A'}
                            </TableCell>
                            <TableCell>UGX {(activity.commission_earned || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                activity.status === 'processed' ? 'default' :
                                activity.status === 'paid' ? 'secondary' : 'outline'
                              }>
                                {activity.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {activity.status === 'processed' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateActivityStatus(activity.id, 'paid')}
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="programs">
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Programs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Commission Rate</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {programs.map((program) => (
                          <TableRow key={program.id}>
                            <TableCell className="font-medium">{program.name}</TableCell>
                            <TableCell>{program.description || 'No description'}</TableCell>
                            <TableCell>{(program.commission_rate * 100).toFixed(1)}%</TableCell>
                            <TableCell>{program.currency}</TableCell>
                            <TableCell>
                              <Badge variant={program.is_active ? 'default' : 'secondary'}>
                                {program.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(program.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleProgramStatus(program.id, program.is_active)}
                              >
                                {program.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="campaigns">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Bonus Multiplier</TableHead>
                          <TableHead>Participants</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {campaign.campaign_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(campaign.start_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(campaign.end_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{campaign.bonus_multiplier}x</TableCell>
                            <TableCell>
                              {campaign.current_participants || 0}
                              {campaign.max_participants && ` / ${campaign.max_participants}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                                {campaign.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="milestones">
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Milestones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Threshold</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reward</TableHead>
                          <TableHead>Badge</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestones.map((milestone) => (
                          <TableRow key={milestone.id}>
                            <TableCell className="font-medium">{milestone.name}</TableCell>
                            <TableCell>{milestone.description}</TableCell>
                            <TableCell>{milestone.threshold_value}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {milestone.milestone_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {milestone.reward_type === 'commission_boost' 
                                ? `+${(milestone.reward_value * 100).toFixed(1)}%`
                                : milestone.reward_type
                              }
                            </TableCell>
                            <TableCell>
                              <span style={{ color: milestone.badge_color }}>
                                {milestone.badge_icon} {milestone.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={milestone.is_active ? 'default' : 'secondary'}>
                                {milestone.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Commission Settings
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure referral commission system
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Enable/Disable Toggle */}
                      {(() => {
                        const commissionEnabledSetting = referralSettings.find(s => s.setting_name === 'commission_enabled');
                        const isEnabled = commissionEnabledSetting?.setting_value > 0;
                        
                        return (
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-1">
                              <Label className="text-base font-semibold">
                                Referral Commission System
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable all referral commissions. When disabled, no commissions will be earned on any purchases.
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant={isEnabled ? 'default' : 'destructive'}>
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                                {commissionEnabledSetting && (
                                  <span>Updated: {new Date(commissionEnabledSetting.updated_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={toggleCommissionEnabled}
                            />
                          </div>
                        );
                      })()}
                      
                      {/* Base Commission Rate */}
                      {(() => {
                        const baseRateSetting = referralSettings.find(s => s.setting_name === 'base_commission_rate');
                        const commissionEnabled = referralSettings.find(s => s.setting_name === 'commission_enabled')?.setting_value > 0;
                        
                        if (!baseRateSetting) return null;

                        const handleEdit = () => {
                          setEditCommissionRate((baseRateSetting.setting_value * 100).toString());
                          setEditMode(true);
                        };

                        const handleSave = async () => {
                          const newValue = parseFloat(editCommissionRate) / 100;
                          if (newValue >= 0 && newValue <= 1) {
                            await updateReferralSetting(baseRateSetting.id, newValue);
                            setEditMode(false);
                            setEditCommissionRate('');
                          } else {
                            toast.error('Commission rate must be between 0% and 100%');
                          }
                        };

                        const handleCancel = () => {
                          setEditMode(false);
                          setEditCommissionRate('');
                        };
                        
                        return (
                          <div className={`flex items-center justify-between p-4 border rounded-lg ${!commissionEnabled ? 'opacity-50' : ''}`}>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">
                                Base Commission Rate
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                {baseRateSetting.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Currency: {baseRateSetting.currency}</span>
                                <Badge variant={baseRateSetting.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {baseRateSetting.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {!editMode ? (
                                <>
                                  <div className="text-right">
                                    <div className="text-lg font-semibold">
                                      {(baseRateSetting.setting_value * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Updated: {new Date(baseRateSetting.updated_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleEdit}
                                    disabled={!commissionEnabled}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="Rate %"
                                    className="w-20"
                                    value={editCommissionRate}
                                    onChange={(e) => setEditCommissionRate(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSave();
                                      } else if (e.key === 'Escape') {
                                        handleCancel();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={handleSave}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancel}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {referralSettings.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No referral settings configured yet.
                      </div>
                    )}
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
export default AdminReferrals;
