import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Images, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MediaGallery from '@/components/media/MediaGallery';

const HomeMediaShowcase = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            See Our Operations in Action
          </h2>
          <p className="text-xl text-muted-foreground">
            Take a visual journey through our mining facilities, equipment, and the dedicated 
            team behind Yawatu's success.
          </p>
        </div>

        {/* Featured Media Grid */}
        <div className="mb-12">
          <MediaGallery featured={true} limit={6} />
        </div>

        {/* Categories Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Images className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Mining Operations</h3>
                  <p className="text-sm text-muted-foreground">Live from the field</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Get an inside look at our state-of-the-art mining processes and sustainable practices.
              </p>
              <Link to="/media-gallery">
                <Button variant="outline" className="w-full">
                  View Mining Photos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Equipment & Technology</h3>
                  <p className="text-sm text-muted-foreground">Modern machinery</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Discover the advanced equipment and technology that drives our efficient operations.
              </p>
              <Link to="/media-gallery">
                <Button variant="outline" className="w-full">
                  See Equipment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Images className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Our Team</h3>
                  <p className="text-sm text-muted-foreground">Women-led leadership</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Meet the dedicated professionals who make Yawatu's vision a reality.
              </p>
              <Link to="/media-gallery">
                <Button variant="outline" className="w-full">
                  Meet Our Team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-8 pb-8">
              <h3 className="text-2xl font-bold mb-4">Explore Our Complete Media Gallery</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Browse through our extensive collection of photos and videos showcasing every aspect 
                of our mining operations, from extraction to processing.
              </p>
              <Link to="/media-gallery">
                <Button size="lg" className="text-lg px-8">
                  <Images className="mr-2 h-5 w-5" />
                  View Full Gallery
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HomeMediaShowcase;