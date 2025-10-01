
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, MapPin, Calendar, UserCheck, Clock, XCircle, TrendingUp } from 'lucide-react';

interface UserStats {
  total_users: number;
  verified_users: number;
  pending_users: number;
  blocked_users: number;
  unverified_users: number;
  male_users: number;
  female_users: number;
  other_gender_users: number;
  countries: { country: string; count: number }[];
  user_types: { type: string; count: number }[];
  recent_signups: number;
  age_groups: { group: string; count: number }[];
}

const UsersDemographicsStats = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      // Get all profiles data
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('status, user_type, country_of_residence, gender, date_of_birth, created_at');

      if (error) throw error;

      if (!profiles) {
        setStats({
          total_users: 0,
          verified_users: 0,
          pending_users: 0,
          blocked_users: 0,
          unverified_users: 0,
          male_users: 0,
          female_users: 0,
          other_gender_users: 0,
          countries: [],
          user_types: [],
          recent_signups: 0,
          age_groups: []
        });
        return;
      }

      // Calculate stats
      const totalUsers = profiles.length;
      const verifiedUsers = profiles.filter(p => p.status === 'active').length;
      const pendingUsers = profiles.filter(p => p.status === 'pending_verification').length;
      const blockedUsers = profiles.filter(p => p.status === 'blocked').length;
      const unverifiedUsers = profiles.filter(p => p.status === 'unverified' || !p.status).length;

      // Gender stats
      const maleUsers = profiles.filter(p => p.gender === 'male').length;
      const femaleUsers = profiles.filter(p => p.gender === 'female').length;
      const otherGenderUsers = profiles.filter(p => p.gender && !['male', 'female'].includes(p.gender)).length;

      // Country distribution
      const countryCount = profiles.reduce((acc, profile) => {
        const country = profile.country_of_residence;
        if (country) {
          acc[country] = (acc[country] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const countries = Object.entries(countryCount)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      // User type distribution
      const userTypeCount = profiles.reduce((acc, profile) => {
        const type = profile.user_type || 'individual';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const userTypes = Object.entries(userTypeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Recent signups (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSignups = profiles.filter(p => 
        p.created_at && new Date(p.created_at) >= thirtyDaysAgo
      ).length;

      // Age groups
      const ageGroups = profiles.reduce((acc, profile) => {
        if (profile.date_of_birth) {
          const age = Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          let group = 'Unknown';
          if (age < 18) group = 'Under 18';
          else if (age < 25) group = '18-24';
          else if (age < 35) group = '25-34';
          else if (age < 45) group = '35-44';
          else if (age < 55) group = '45-54';
          else group = '55+';
          
          acc[group] = (acc[group] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const ageGroupsArray = Object.entries(ageGroups)
        .map(([group, count]) => ({ group, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        total_users: totalUsers,
        verified_users: verifiedUsers,
        pending_users: pendingUsers,
        blocked_users: blockedUsers,
        unverified_users: unverifiedUsers,
        male_users: maleUsers,
        female_users: femaleUsers,
        other_gender_users: otherGenderUsers,
        countries,
        user_types: userTypes,
        recent_signups: recentSignups,
        age_groups: ageGroupsArray
      });

    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading user statistics...</div>;
  }

  if (!stats) {
    return <div>Failed to load user statistics</div>;
  }

  return (
    <div className="space-y-6">
      {/* User Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total_users}</p>
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
                <p className="text-2xl font-bold text-green-600">{stats.verified_users}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_users}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unverified</p>
                <p className="text-2xl font-bold text-gray-600">{stats.unverified_users}</p>
              </div>
              <Users className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-red-600">{stats.blocked_users}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Male</span>
                <Badge variant="secondary">{stats.male_users}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Female</span>
                <Badge variant="secondary">{stats.female_users}</Badge>
              </div>
              {stats.other_gender_users > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Other</span>
                  <Badge variant="secondary">{stats.other_gender_users}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Country Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.countries.slice(0, 5).map((country, index) => (
                <div key={country.country} className="flex justify-between items-center">
                  <span className="text-sm">{country.country}</span>
                  <Badge variant="secondary">{country.count}</Badge>
                </div>
              ))}
              {stats.countries.length === 0 && (
                <p className="text-muted-foreground text-sm">No country data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Age Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Age Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.age_groups.map((group, index) => (
                <div key={group.group} className="flex justify-between items-center">
                  <span className="text-sm">{group.group}</span>
                  <Badge variant="secondary">{group.count}</Badge>
                </div>
              ))}
              {stats.age_groups.length === 0 && (
                <p className="text-muted-foreground text-sm">No age data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Types and Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Account Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.user_types.map((type, index) => (
                <div key={type.type} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{type.type}</span>
                  <Badge variant="secondary">{type.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              <Badge className="bg-blue-500">{stats.recent_signups}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsersDemographicsStats;
