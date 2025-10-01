
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface CombinedProfileHeaderProps {
  profile: any;
  onProfileUpdate: () => void;
}

const CombinedProfileHeader: React.FC<CombinedProfileHeaderProps> = ({ profile, onProfileUpdate }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      // Simulate upload - replace with actual Supabase storage upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Profile picture updated successfully');
      onProfileUpdate();
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_verification': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unverified': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Overview 2
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture Section */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.profile_picture_url} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="text-xl">
                {(profile?.full_name || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              variant="outline"
              className="absolute bottom-0 right-0 rounded-full p-2"
              onClick={() => document.getElementById('picture-upload')?.click()}
              disabled={uploading}
            >
              <Camera className="h-3 w-3" />
            </Button>
            <Input
              id="picture-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold">{profile?.full_name || 'User'}</h3>
              <p className="text-muted-foreground">{profile?.email}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="picture-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={uploading}>
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Change Picture'}
                </Button>
              </Label>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, max 5MB
            </p>
          </div>
        </div>

        {/* Account Status Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Account Status</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Verification Status</span>
                <Badge className={getStatusColor(profile?.status || 'unverified')}>
                  {(profile?.status || 'unverified').replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Account Type</span>
                <Badge variant="outline">
                  {profile?.user_type || 'individual'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Completion</span>
                <span className="text-sm font-medium">
                  {profile?.profile_completion_percentage || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Personal Info</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Phone</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.phone || 'Not provided'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Location</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.town_city && profile?.country_of_residence 
                    ? `${profile.town_city}, ${profile.country_of_residence}`
                    : 'Not provided'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">TIN</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.tin || 'Optional - Not provided'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {uploading && (
          <div className="flex items-center gap-2 pt-4 border-t">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Uploading profile picture...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CombinedProfileHeader;
