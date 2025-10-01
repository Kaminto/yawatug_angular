import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import { useUser } from '@/providers/UserProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Upload,
  Edit,
  Save,
  X,
  Shield,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import ProfileGamification from '@/components/profile/ProfileGamification';

const UserProfile = () => {
  const { user, userProfile, loading: userLoading } = useUser();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    nationality: '',
    country_of_residence: '',
    address: ''
  });

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Profile' }
  ];

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        date_of_birth: userProfile.date_of_birth || '',
        nationality: userProfile.nationality || '',
        country_of_residence: userProfile.country_of_residence || '',
        address: userProfile.address || ''
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        date_of_birth: userProfile.date_of_birth || '',
        nationality: userProfile.nationality || '',
        country_of_residence: userProfile.country_of_residence || '',
        address: userProfile.address || ''
      });
    }
    setEditing(false);
  };

  const getStatusBadge = () => {
    if (!userProfile) return null;
    
    if (userProfile.status === 'active' && userProfile.is_verified) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    
    if (userProfile.status === 'pending_verification') {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending Verification
        </Badge>
      );
    }
    
    if (userProfile.status === 'blocked') {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Unverified
      </Badge>
    );
  };

  const getCompletionPercentage = () => {
    if (!userProfile) return 0;
    
    const fields = [
      userProfile.full_name,
      userProfile.phone,
      userProfile.date_of_birth,
      userProfile.nationality,
      userProfile.country_of_residence,
      userProfile.address,
      userProfile.profile_picture_url
    ];
    
    const completedFields = fields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  if (userLoading) {
    return (
      <UserLayout title="My Profile" breadcrumbs={breadcrumbs}>
        <MobileBottomPadding>
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-muted rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-48"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              </div>
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        </MobileBottomPadding>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="My Profile" breadcrumbs={breadcrumbs}>
      <MobileBottomPadding>
        <div className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={userProfile?.profile_picture_url} alt={userProfile?.full_name} />
                    <AvatarFallback className="text-xl">
                      {userProfile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Upload className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {userProfile?.full_name || 'Complete your profile'}
                      </h2>
                      <p className="text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                      {getStatusBadge()}
                      {!editing ? (
                        <Button onClick={() => setEditing(true)} size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button onClick={handleSave} size="sm" disabled={loading}>
                            <Save className="h-4 w-4 mr-2" />
                            {loading ? 'Saving...' : 'Save'}
                          </Button>
                          <Button onClick={handleCancel} size="sm" variant="outline">
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Profile Completion */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Profile Completion</span>
                      <span className="font-medium">{getCompletionPercentage()}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-yawatu-gold h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getCompletionPercentage()}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Alert */}
          {userProfile?.status !== 'active' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {userProfile?.status === 'pending_verification' 
                  ? 'Your account verification is in progress. You\'ll be notified once it\'s complete.'
                  : 'Complete your profile and verify your account to unlock all features.'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Gamification */}
          <ProfileGamification
            completionPercentage={getCompletionPercentage()}
            level={Math.floor(getCompletionPercentage() / 20) + 1}
          />

          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                        disabled={!editing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={profileData.date_of_birth}
                        onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                        disabled={!editing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={profileData.nationality}
                        onChange={(e) => setProfileData({ ...profileData, nationality: e.target.value })}
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country_of_residence">Country of Residence</Label>
                    <Input
                      id="country_of_residence"
                      value={profileData.country_of_residence}
                      onChange={(e) => setProfileData({ ...profileData, country_of_residence: e.target.value })}
                      disabled={!editing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      disabled={!editing}
                      placeholder="Enter your full address"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Identity Documents
                  </CardTitle>
                  <CardDescription>
                    Upload and manage your verification documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Documents Uploaded</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload your identity documents to complete verification
                    </p>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Password</h4>
                      <p className="text-sm text-muted-foreground">
                        Last updated: Never
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Enable 2FA
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Login Sessions</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage your active login sessions
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MobileBottomPadding>
    </UserLayout>
  );
};

export default UserProfile;