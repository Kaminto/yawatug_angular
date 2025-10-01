import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MediaUploadManager from '@/components/admin/MediaUploadManager';
import MediaGallery from '@/components/media/MediaGallery';

const AdminMedia = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleUploadComplete = () => setRefreshKey((k) => k + 1);
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Media Management</h1>
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Media</TabsTrigger>
          <TabsTrigger value="gallery">Manage Gallery</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Media</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUploadManager onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Media Gallery Management</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaGallery category="all" showAdminControls={true} key={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMedia;