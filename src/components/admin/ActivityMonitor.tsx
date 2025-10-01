
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const ActivityMonitor: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');

  const loadActivities = async () => {
    try {
      let query = supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityFilter !== 'all') {
        query = query.eq('activity_type', activityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [activityFilter]);

  const filteredActivities = activities.filter(activity =>
    activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-green-100 text-green-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'transaction': return 'bg-blue-100 text-blue-800';
      case 'profile_update': return 'bg-yellow-100 text-yellow-800';
      case 'security': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div>Loading activity logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          User Activity Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="transaction">Transaction</SelectItem>
              <SelectItem value="profile_update">Profile Update</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadActivities}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activities found</p>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Badge className={getActivityColor(activity.activity_type)}>
                      {activity.activity_type}
                    </Badge>
                    <span className="font-medium">{activity.description}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    User: {activity.user_id} • IP: {activity.ip_address} • 
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityMonitor;
