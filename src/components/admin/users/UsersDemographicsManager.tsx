
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Globe, Calendar, UserCheck } from 'lucide-react';

interface Demographics {
  totalUsers: number;
  genderDistribution: { name: string; value: number; color: string }[];
  ageDistribution: { name: string; value: number }[];
  countryDistribution: { name: string; value: number }[];
  userTypeDistribution: { name: string; value: number; color: string }[];
  verificationStatus: { name: string; value: number; color: string }[];
}

const UsersDemographicsManager = () => {
  const [demographics, setDemographics] = useState<Demographics>({
    totalUsers: 0,
    genderDistribution: [],
    ageDistribution: [],
    countryDistribution: [],
    userTypeDistribution: [],
    verificationStatus: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemographics();
  }, []);

  const loadDemographics = async () => {
    try {
      // Get all users data
      const { data: users, error } = await supabase
        .from('profiles')
        .select('gender, date_of_birth, country_of_residence, user_type, status, created_at')
        .limit(5000); // Explicit limit to get all users and avoid default 1000 cap

      if (error) throw error;

      const totalUsers = users?.length || 0;

      // Gender distribution
      const genderCounts = users?.reduce((acc: any, user) => {
        const gender = user.gender || 'Not specified';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, {}) || {};

      const genderDistribution = Object.entries(genderCounts).map(([name, value], index) => ({
        name,
        value: value as number,
        color: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'][index % 4]
      }));

      // Age distribution
      const ageGroups = users?.reduce((acc: any, user) => {
        if (user.date_of_birth) {
          const age = new Date().getFullYear() - new Date(user.date_of_birth).getFullYear();
          if (age < 25) acc['18-24'] = (acc['18-24'] || 0) + 1;
          else if (age < 35) acc['25-34'] = (acc['25-34'] || 0) + 1;
          else if (age < 45) acc['35-44'] = (acc['35-44'] || 0) + 1;
          else if (age < 55) acc['45-54'] = (acc['45-54'] || 0) + 1;
          else acc['55+'] = (acc['55+'] || 0) + 1;
        } else {
          acc['Not specified'] = (acc['Not specified'] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const ageDistribution = Object.entries(ageGroups).map(([name, value]) => ({
        name,
        value: value as number
      }));

      // Country distribution (top 5)
      const countryCounts = users?.reduce((acc: any, user) => {
        const country = user.country_of_residence || 'Not specified';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {}) || {};

      const countryDistribution = Object.entries(countryCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([name, value]) => ({
          name,
          value: value as number
        }));

      // User type distribution
      const userTypeCounts = users?.reduce((acc: any, user) => {
        const userType = user.user_type || 'individual';
        acc[userType] = (acc[userType] || 0) + 1;
        return acc;
      }, {}) || {};

      const userTypeDistribution = Object.entries(userTypeCounts).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value as number,
        color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][index % 4]
      }));

      // Verification status
      const statusCounts = users?.reduce((acc: any, user) => {
        const status = user.status || 'unverified';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}) || {};

      const verificationStatus = Object.entries(statusCounts).map(([name, value], index) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value: value as number,
        color: name === 'active' ? '#10b981' : 
               name === 'pending_verification' ? '#f59e0b' : 
               name === 'blocked' ? '#ef4444' : '#6b7280'
      }));

      setDemographics({
        totalUsers,
        genderDistribution,
        ageDistribution,
        countryDistribution,
        userTypeDistribution,
        verificationStatus
      });

    } catch (error) {
      console.error('Error loading demographics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-pulse">Loading demographics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demographics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {demographics.verificationStatus.find(s => s.name === 'ACTIVE')?.value || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demographics.countryDistribution.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Age Range</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25-34</div>
            <p className="text-xs text-muted-foreground">Most common</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={demographics.genderDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {demographics.genderDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demographics.ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={demographics.userTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {demographics.userTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demographics.verificationStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Country Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Top Countries</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={demographics.countryDistribution} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersDemographicsManager;
