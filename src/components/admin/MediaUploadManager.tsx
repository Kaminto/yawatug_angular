import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, Video, FileText, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploadManagerProps {
  onUploadComplete?: () => void;
}

const MediaUploadManager: React.FC<MediaUploadManagerProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      
      // Auto-fill title if empty
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setTitle(fileName.charAt(0).toUpperCase() + fileName.slice(1));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg', '.mov']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false
  });

  const getFileType = (file: File): 'image' | 'video' => {
    return file.type.startsWith('image/') ? 'image' : 'video';
  };

  const generateThumbnail = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        // For images, use the image itself as thumbnail
        resolve(null);
      } else if (file.type.startsWith('video/')) {
        // For videos, generate a thumbnail
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          video.currentTime = 1; // Seek to 1 second
        });
        
        video.addEventListener('seeked', () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                const thumbnailUrl = URL.createObjectURL(blob);
                resolve(thumbnailUrl);
              } else {
                resolve(null);
              }
            }, 'image/jpeg', 0.8);
          } else {
            resolve(null);
          }
        });
        
        video.src = URL.createObjectURL(file);
      } else {
        resolve(null);
      }
    });
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('media-gallery')
      .upload(path, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('media-gallery')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      toast({
        title: "Missing Information",
        description: "Please select a file and provide a title",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const fileType = getFileType(selectedFile);
      const timestamp = Date.now();
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filePath = `${category}/${timestamp}-${sanitizedTitle}.${selectedFile.name.split('.').pop()}`;

      // Upload main file
      const fileUrl = await uploadFile(selectedFile, filePath);
      
      // Generate and upload thumbnail for videos
      let thumbnailUrl: string | null = null;
      if (fileType === 'video') {
        const thumbnailBlob = await generateThumbnail(selectedFile);
        if (thumbnailBlob) {
          const thumbnailPath = `${category}/thumbnails/${timestamp}-${sanitizedTitle}-thumb.jpg`;
          // Convert blob URL to actual blob
          const response = await fetch(thumbnailBlob);
          const blob = await response.blob();
          thumbnailUrl = await uploadFile(blob as File, thumbnailPath);
        }
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('media_gallery')
        .insert({
          title,
          description,
          media_type: fileType,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          category,
          is_featured: isFeatured,
          display_order: displayOrder
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload Successful",
        description: "Media has been uploaded successfully",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('general');
      setIsFeatured(false);
      setDisplayOrder(0);
      setSelectedFile(null);
      setPreviewUrl(null);

      onUploadComplete?.();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload media",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'mining', label: 'Mining Operations' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'team', label: 'Team & People' },
    { value: 'facilities', label: 'Facilities' },
    { value: 'products', label: 'Products' },
    { value: 'events', label: 'Events' },
    { value: 'testimonials', label: 'Testimonials' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          {selectedFile ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                {previewUrl && (
                  <>
                    {getFileType(selectedFile) === 'image' ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-32 max-w-full object-contain rounded"
                      />
                    ) : (
                      <video
                        src={previewUrl}
                        className="max-h-32 max-w-full object-contain rounded"
                        controls
                      />
                    )}
                  </>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop your media file here'}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to select files
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports images and videos up to 100MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Media Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter media title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter media description (optional)"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="featured"
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
            />
            <Label htmlFor="featured" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Featured Media
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !title || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MediaUploadManager;