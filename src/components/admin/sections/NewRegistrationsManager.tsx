import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserPlus, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Mail,
  Phone,
  Calendar,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  account_type: string;
  country_of_residence: string;
  profile_picture_url: string | null;
  created_at: string;
  profile_completion_percentage: number;
  login_count: number;
}

const NewRegistrationsManager = () => {
  const [newUsers, setNewUsers] = useState<NewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<NewUser | null>(null);
  const [viewDialog, setViewDialog] = useState(false);

  useEffect(() => {
    loadNewRegistrations();
  }, []);

  const loadNewRegistrations = async () => {
    try {
      setLoading(true);
      
      // Get new registrations from last 7 days, excluding imported users
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .is('import_batch_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNewUsers(data || []);
    } catch (error) {
      console.error('Error loading new registrations:', error);
      toast.error('Failed to load new registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User activated successfully');
      loadNewRegistrations();
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending_verification': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'blocked': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'individual': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-green-100 text-green-800';
      case 'organisation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Less than an hour ago';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-muted h-12 w-12"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">New User Registrations</h3>
          <p className="text-sm text-muted-foreground">
            Recent signups requiring initial review and onboarding (Last 7 days)
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {newUsers.length} new users
        </Badge>
      </div>

      <div className="space-y-4">
        {newUsers.map(user => (
          <Card key={user.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.profile_picture_url || ''} />
                    <AvatarFallback>
                      {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{user.full_name || 'Unnamed User'}</h4>
                      <Badge className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                      <Badge className={getAccountTypeColor(user.account_type)}>
                        {user.account_type || 'individual'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {user.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                      )}
                      {user.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {user.phone}
                        </div>
                      )}
                      {user.country_of_residence && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {user.country_of_residence}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Registered {formatTimeAgo(user.created_at)}
                      </div>
                      <div>
                        Profile: {user.profile_completion_percentage || 0}% complete
                      </div>
                      <div>
                        Logins: {user.login_count || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Dialog open={viewDialog && selectedUser?.id === user.id} 
                          onOpenChange={(open) => {
                            setViewDialog(open);
                            if (!open) setSelectedUser(null);
                          }}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>User Profile Review</DialogTitle>
                      </DialogHeader>
                      
                      {selectedUser && (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={selectedUser.profile_picture_url || ''} />
                              <AvatarFallback className="text-lg">
                                {selectedUser.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium text-lg">{selectedUser.full_name}</h3>
                              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Status</p>
                              <Badge className={getStatusColor(selectedUser.status)}>
                                {selectedUser.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                              <Badge className={getAccountTypeColor(selectedUser.account_type)}>
                                {selectedUser.account_type || 'individual'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Profile Completion</p>
                              <p className="text-sm">{selectedUser.profile_completion_percentage || 0}%</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Login Count</p>
                              <p className="text-sm">{selectedUser.login_count || 0}</p>
                            </div>
                          </div>

                          {selectedUser.phone && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Phone</p>
                              <p className="text-sm">{selectedUser.phone}</p>
                            </div>
                          )}

                          {selectedUser.country_of_residence && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Country</p>
                              <p className="text-sm">{selectedUser.country_of_residence}</p>
                            </div>
                          )}

                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
                            <p className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</p>
                          </div>

                          {selectedUser.status !== 'active' && (
                            <div className="flex gap-2 pt-4">
                              <Button
                                onClick={() => {
                                  handleActivateUser(selectedUser.id);
                                  setViewDialog(false);
                                }}
                                className="flex-1"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Activate User
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {user.status !== 'active' && (
                    <Button
                      size="sm"
                      onClick={() => handleActivateUser(user.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {newUsers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No new registrations in the last 7 days</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users who have recently signed up will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NewRegistrationsManager;