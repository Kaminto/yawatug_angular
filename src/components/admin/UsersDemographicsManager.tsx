
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, MapPin, Calendar, UserCheck, Clock, XCircle } from 'lucide-react';

interface UserDemographic {
  total_users: number;
  verified_users: number;
  pending_users: number;
  blocked_users: number;
  countries: { country: string; count: number }[];
  user_types: { type: string; count: number }[];
  recent_signups: number;
}

const UsersDemographicsManager = () => {
  const [demographics, setDemographics] = useState<UserDemographic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemographics();
  }, []);

  const loadDemographics = async () => {
    try {
      // Get total user count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get user status breakdown
      const { count: verifiedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: pendingUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_verification');

      const { count: blockedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'blocked');

      // Get country distribution
      const { data: countryData } = await supabase
        .from('profiles')
        .select('country_of_residence')
        .not('country_of_residence', 'is', null);

      // Get user type distribution
      const { data: userTypeData } = await supabase
        .from('profiles')
        .select('user_type')
        .not('user_type', 'is', null);

      // Get recent signups (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentSignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Process country data
      const countryCount = countryData?.reduce((acc, profile) => {
        const country = profile.country_of_residence;
        if (country) {
          acc[country] = (acc[country] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const countries = Object.entries(countryCount)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      // Process user type data
      const userTypeCount = userTypeData?.reduce((acc, profile) => {
        const type = profile.user_type;
        if (type) {
          acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const userTypes = Object.entries(userTypeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      setDemographics({
        total_users: totalUsers || 0,
        verified_users: verifiedUsers || 0,
        pending_users: pendingUsers || 0,
        blocked_users: blockedUsers || 0,
        countries,
        user_types: userTypes,
        recent_signups: recentSignups || 0
      });

    } catch (error) {
      console.error('Error loading demographics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading demographics...</div>;
  }

  if (!demographics) {
    return <div>Failed to load demographics</div>;
  }

  return (
    <div className="space-y-6">
      {/* User Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{demographics.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-green-600">{demographics.verified_users}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{demographics.pending_users}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-red-600">{demographics.blocked_users}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Country Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {demographics.countries.slice(0, 10).map((country, index) => (
                <div key={country.country} className="flex justify-between items-center">
                  <span className="text-sm">{country.country}</span>
                  <Badge variant="secondary">{country.count}</Badge>
                </div>
              ))}
              {demographics.countries.length === 0 && (
                <p className="text-muted-foreground text-sm">No country data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Account Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {demographics.user_types.map((type, index) => (
                <div key={type.type} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{type.type}</span>
                  <Badge variant="secondary">{type.count}</Badge>
                </div>
              ))}
              {demographics.user_types.length === 0 && (
                <p className="text-muted-foreground text-sm">No user type data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>New signups (Last 30 days)</span>
            <Badge className="bg-blue-500">{demographics.recent_signups}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersDemographicsManager;
