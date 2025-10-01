import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ArrowLeft, ArrowRight, X, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MediaItem {
  id: string;
  title: string;
  description?: string;
  media_type: 'image' | 'video';
  file_url: string;
  thumbnail_url?: string;
  category: string;
  is_featured: boolean;
  display_order: number;
}

interface MediaGalleryProps {
  category?: string;
  featured?: boolean;
  limit?: number;
  showAdminControls?: boolean;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ 
  category = 'general', 
  featured = false,
  limit = 12,
  showAdminControls = false
}) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadMedia();
  }, [category, featured, limit]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('media_gallery')
        .select('*')
        .order('display_order', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (featured) {
        query = query.eq('is_featured', true);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMedia((data || []).map(item => ({
        ...item,
        media_type: item.media_type as 'image' | 'video'
      })));
    } catch (error) {
      console.error('Error loading media:', error);
      toast({
        title: "Error",
        description: "Failed to load media gallery",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (item: MediaItem, index: number) => {
    setSelectedMedia(item);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const nextMedia = () => {
    const newIndex = (currentIndex + 1) % media.length;
    setCurrentIndex(newIndex);
    setSelectedMedia(media[newIndex]);
  };

  const prevMedia = () => {
    const newIndex = currentIndex === 0 ? media.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    setSelectedMedia(media[newIndex]);
  };

  const downloadMedia = (item: MediaItem) => {
    const link = document.createElement('a');
    link.href = item.file_url;
    link.download = item.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="aspect-video bg-muted rounded-t-lg"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {media.map((item, index) => (
          <Card key={item.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
            <div 
              className="relative aspect-video overflow-hidden rounded-t-lg"
              onClick={() => openLightbox(item, index)}
            >
              <img
                src={item.thumbnail_url || item.file_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              {item.media_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-12 w-12 text-white" />
                </div>
              )}
              {item.is_featured && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                  Featured
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-medium mb-1 line-clamp-1">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => downloadMedia(selectedMedia)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={closeLightbox}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            {media.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={prevMedia}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={nextMedia}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Media Content */}
            <div className="bg-white rounded-lg overflow-hidden">
              {selectedMedia.media_type === 'video' ? (
                <video
                  src={selectedMedia.file_url}
                  controls
                  className="w-full max-h-[70vh] object-contain"
                />
              ) : (
                <img
                  src={selectedMedia.file_url}
                  alt={selectedMedia.title}
                  className="w-full max-h-[70vh] object-contain"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{selectedMedia.title}</h3>
                {selectedMedia.description && (
                  <p className="text-muted-foreground">{selectedMedia.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaGallery;