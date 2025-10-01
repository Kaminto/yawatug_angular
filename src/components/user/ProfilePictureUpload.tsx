
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ProfilePictureUploadProps {
  currentPicture?: string;
  fullName: string;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({ currentPicture, fullName }) => {
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
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Profile picture updated successfully');
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Picture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={currentPicture} alt={fullName} />
            <AvatarFallback className="text-lg">
              {fullName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <Label htmlFor="picture-upload">Upload New Picture</Label>
            <div className="flex items-center gap-2">
              <Input
                id="picture-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="max-w-xs"
              />
              <Upload className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, max 5MB
            </p>
          </div>
        </div>

        {uploading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Uploading...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfilePictureUpload;
