
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfilePictureUploadProps {
  currentImageUrl: string;
  onUploadComplete: () => void;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  onUploadComplete
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profile picture updated successfully');
      onUploadComplete();
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast.error(`Failed to upload profile picture: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' // Front camera for selfies
        } 
      });
      console.log('Camera access granted', mediaStream);
      setStream(mediaStream);
      setShowCamera(true);
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          console.log('Setting video srcObject...');
          videoRef.current.srcObject = mediaStream;
          
          // Enhanced video setup
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => console.log('Video started playing'))
                .catch(error => console.error('Error playing video:', error));
            }
          };
          
          // Additional error handling
          videoRef.current.onerror = (e) => {
            console.error('Video element error:', e);
          };
          
          // Force play if metadata is already loaded
          if (videoRef.current.readyState >= 2) {
            videoRef.current.play()
              .then(() => console.log('Video started playing (immediate)'))
              .catch(error => console.error('Error playing video (immediate):', error));
          }
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Better error messaging based on the error type
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is already in use by another application.');
      } else {
        toast.error('Could not access camera. Please try using file upload instead.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        await handleFileUpload(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="w-32 h-32">
            <AvatarImage src={currentImageUrl} alt="Profile" />
            <AvatarFallback>
              <User className="w-16 h-16" />
            </AvatarFallback>
          </Avatar>

          {!showCamera ? (
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              
              <Button
                variant="outline"
                onClick={startCamera}
                disabled={uploading}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative w-64 h-48 rounded-lg overflow-hidden border-2 border-border bg-muted">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover bg-black"
                  style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={capturePhoto} disabled={uploading}>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />

          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfilePictureUpload;
