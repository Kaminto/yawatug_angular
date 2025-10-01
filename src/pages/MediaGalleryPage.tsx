import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import MediaGallery from '@/components/media/MediaGallery';
import { Images, Video, Star, Grid } from 'lucide-react';

const MediaGalleryPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFeatured, setShowFeatured] = useState(false);

  const categories = [
    { value: 'all', label: 'All Media', icon: Grid },
    { value: 'general', label: 'General', icon: Images },
    { value: 'mining', label: 'Mining Operations', icon: Images },
    { value: 'equipment', label: 'Equipment', icon: Images },
    { value: 'team', label: 'Team & People', icon: Images },
    { value: 'facilities', label: 'Facilities', icon: Images },
    { value: 'products', label: 'Products', icon: Images },
    { value: 'events', label: 'Events', icon: Video },
    { value: 'testimonials', label: 'Testimonials', icon: Video }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="charcoal-section relative py-16">
        <div className="mining-pattern absolute inset-0"></div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-foreground mb-6">
              Media Gallery
            </h1>
            <p className="text-xl text-secondary-foreground/80 mb-8">
              Explore our comprehensive collection of images and videos showcasing 
              Yawatu's mining operations, team, and facilities.
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Featured Media Section */}
          <div className="mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Featured Media
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MediaGallery featured={true} limit={6} />
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Filter Media</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse by category to find specific content
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Category:</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center gap-2">
                                <category.icon className="h-4 w-4" />
                                {category.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedCategory !== 'all' && (
                      <Badge variant="secondary" className="capitalize">
                        {categories.find(c => c.value === selectedCategory)?.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Gallery */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Images className="h-5 w-5" />
                  {selectedCategory === 'all' ? 'All Media' : categories.find(c => c.value === selectedCategory)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MediaGallery 
                  category={selectedCategory === 'all' ? undefined : selectedCategory}
                  featured={false}
                />
              </CardContent>
            </Card>
          </div>

          {/* Categories Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.filter(cat => cat.value !== 'all').map((category) => (
              <Card 
                key={category.value} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedCategory(category.value)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{category.label}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    View all {category.label.toLowerCase()} content
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MediaGalleryPage;