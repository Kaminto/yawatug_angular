import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
interface ProfileHeaderProps {
  profile: any;
  documents: any[];
  contactPersons: any[];
  onProfileUpdate: () => void;
}
const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  documents,
  contactPersons,
  onProfileUpdate
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  // Ref to Input for file dialog
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
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
      // Get authenticated user ID
      if (!user) throw new Error("No user found");
      const userId = user.id;

      // 1. Upload to Supabase storage using the correct bucket name
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${userId}.${fileExt}`;
      console.log('Uploading to profile_pictures bucket with path:', filePath);

      // Upload file, overwrite if exists
      let {
        data,
        error
      } = await supabase.storage.from('profile_pictures').upload(filePath, file, {
        upsert: true
      });
      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }
      console.log('Upload successful:', data);

      // 2. Get the public URL for the file
      const {
        data: publicData
      } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public avatar link.");
      console.log('Public URL:', publicUrl);

      // 3. Update profile.profile_picture_url in DB
      const {
        error: dbError
      } = await supabase.from('profiles').update({
        profile_picture_url: publicUrl
      }).eq('id', userId);
      if (dbError) {
        console.error('Database update error:', dbError);
        throw dbError;
      }
      toast.success('Profile picture updated successfully');
      onProfileUpdate();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Use the same calculation logic as ProfileCompletionTracker
  const getCompletionPercentage = () => {
    const requiredFields = ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'nationality', 'country_of_residence', 'address'];
    const completedFields = requiredFields.filter(field => {
      const value = profile?.[field];
      return value && value.toString().trim() !== '';
    });
    const profileScore = completedFields.length / requiredFields.length * 40;

    // Profile picture score
    const pictureScore = profile?.profile_picture_url ? 20 : 0;

    // Documents score (at least 2 required documents)
    const requiredDocs = Math.min(documents.length, 2);
    const documentScore = requiredDocs / 2 * 20;

    // Emergency contacts score (at least 1 required)
    const contactScore = contactPersons.length > 0 ? 20 : 0;
    return Math.round(profileScore + pictureScore + documentScore + contactScore);
  };
  return <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.profile_picture_url} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="text-lg">
                {(profile?.full_name || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Always show clickable camera button to change photo */}
            <Button size="sm" variant="outline" className="absolute bottom-0 right-0 rounded-full p-2" onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
              fileInputRef.current.click();
            }
          }} disabled={uploading} aria-label="Change Photo">
              <Camera className="h-3 w-3" />
            </Button>
            {/* Hidden file input */}
            <Input ref={fileInputRef} id="picture-upload" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-semibold">{profile?.full_name || 'User'}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(profile?.status || 'unverified')}>
                {(profile?.status || 'unverified').replace('_', ' ')}
              </Badge>
            </div>

            

            {uploading && <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Uploading...</span>
              </div>}
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default ProfileHeader;