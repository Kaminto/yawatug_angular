import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  ExternalLink, 
  Calendar, 
  User, 
  Play,
  Image as ImageIcon,
  Mail,
  Filter,
  Search
} from 'lucide-react';

const News = () => {
  const [emailSignup, setEmailSignup] = useState('');

  const newsItems = [
    {
      id: 1,
      title: "Yawatu Secures New Mining Concession in Buhweju District",
      excerpt: "Major expansion of our operations with a new 50-hectare concession focusing on sustainable extraction practices.",
      date: "2024-01-15",
      author: "Sarah Nakato",
      category: "Operations",
      image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=250&fit=crop"
    },
    {
      id: 2,
      title: "Q4 2023 Production Results Exceed Targets by 15%",
      excerpt: "Strong performance across all mining sites with record production levels and maintained safety standards.",
      date: "2024-01-10",
      author: "Investment Team",
      category: "Financial",
      image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=400&h=250&fit=crop"
    },
    {
      id: 3,
      title: "Women in Mining Training Program Graduates 50 Participants",
      excerpt: "Celebrating the success of our community empowerment initiative with new certified mining technicians.",
      date: "2024-01-08",
      author: "Grace Atuhaire",
      category: "Community",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop"
    }
  ];

  const galleryItems = [
    {
      id: 1,
      type: "image",
      title: "Mining Operations in Mubende",
      description: "State-of-the-art extraction equipment in operation",
      url: "https://images.unsplash.com/photo-1473091534298-04dcbce3278c?w=600&h=400&fit=crop"
    },
    {
      id: 2,
      type: "video",
      title: "Community Water Project Completion",
      description: "Celebrating the completion of our latest community initiative",
      url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop"
    },
    {
      id: 3,
      type: "image",
      title: "Leadership Team at Mining Conference",
      description: "CEO Sarah Nakato presenting at East Africa Mining Summit",
      url: "https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=600&h=400&fit=crop"
    },
    {
      id: 4,
      type: "image",
      title: "Sustainable Mining Practices",
      description: "Environmental rehabilitation in progress",
      url: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=600&h=400&fit=crop"
    }
  ];

  const pressItems = [
    {
      id: 1,
      outlet: "East African Business Weekly",
      title: "Yawatu Minerals Leading Uganda's Gold Mining Revolution",
      date: "2024-01-12",
      url: "#"
    },
    {
      id: 2,
      outlet: "Mining Journal Africa",
      title: "Women-Led Mining Company Sets New Standards",
      date: "2024-01-05",
      url: "#"
    },
    {
      id: 3,
      outlet: "Uganda Investment Review",
      title: "ESG Excellence in African Mining Sector",
      date: "2023-12-28",
      url: "#"
    }
  ];

  const downloadableResources = [
    {
      id: 1,
      title: "Investment Prospectus 2024",
      description: "Comprehensive overview of investment opportunities and financial projections",
      type: "PDF",
      size: "2.4 MB",
      downloads: 1247
    },
    {
      id: 2,
      title: "Sustainability Report 2023",
      description: "Detailed ESG performance metrics and community impact assessment",
      type: "PDF",
      size: "1.8 MB",
      downloads: 892
    },
    {
      id: 3,
      title: "Technical Mining Guide",
      description: "White paper on our innovative extraction and processing techniques",
      type: "PDF",
      size: "3.1 MB",
      downloads: 634
    },
    {
      id: 4,
      title: "Investor Fact Sheet",
      description: "Key metrics, milestones, and investment highlights",
      type: "PDF",
      size: "850 KB",
      downloads: 2103
    }
  ];

  const handleNewsletterSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup logic here
    console.log('Newsletter signup:', emailSignup);
    setEmailSignup('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20">
        {/* Hero Section */}
        <section className="pt-32 pb-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-6">News & Media</Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-secondary-foreground">
                Latest News &
                <span className="block gold-text">Media Updates</span>
              </h1>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                Stay informed with the latest updates, achievements, and insights from Yawatu Minerals & Mining Ltd
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {/* Tabs for different sections */}
            <Tabs defaultValue="news" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="news">Latest News</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
                <TabsTrigger value="press">Press Coverage</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              {/* Latest News Tab */}
              <TabsContent value="news" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Company News</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {newsItems.map((item) => (
                    <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img 
                          src={item.image} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{item.category}</Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(item.date).toLocaleDateString()}
                          </div>
                        </div>
                        <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                        <CardDescription>{item.excerpt}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="h-4 w-4 mr-1" />
                            {item.author}
                          </div>
                          <Button variant="ghost" size="sm">
                            Read More
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Photo & Video Gallery</h2>
                  <p className="text-muted-foreground">Explore our operations, community initiatives, and leadership events</p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {galleryItems.map((item) => (
                    <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative aspect-video">
                        <img 
                          src={item.url} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {item.type === 'video' ? (
                            <Play className="h-12 w-12 text-white" />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-white" />
                          )}
                        </div>
                        <Badge className="absolute top-2 right-2 capitalize">
                          {item.type}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Press Coverage Tab */}
              <TabsContent value="press" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Press Coverage</h2>
                  <p className="text-muted-foreground">Media coverage and industry recognition</p>
                </div>
                
                <div className="space-y-4">
                  {pressItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{item.outlet}</Badge>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(item.date).toLocaleDateString()}
                              </div>
                            </div>
                            <h3 className="text-lg font-semibold">{item.title}</h3>
                          </div>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Read Article
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Resources Tab */}
              <TabsContent value="resources" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Downloadable Resources</h2>
                  <p className="text-muted-foreground">Access our reports, prospectus, and investment materials</p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {downloadableResources.map((resource) => (
                    <Card key={resource.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge>{resource.type}</Badge>
                              <span className="text-sm text-muted-foreground">{resource.size}</span>
                            </div>
                            <h3 className="font-semibold">{resource.title}</h3>
                            <p className="text-sm text-muted-foreground">{resource.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {resource.downloads.toLocaleString()} downloads
                            </p>
                          </div>
                          <Button>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Newsletter Signup Section */}
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 mt-16">
              <CardContent className="p-8 text-center">
                <div className="max-w-2xl mx-auto space-y-4">
                  <Mail className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="text-2xl font-bold">Stay Connected</h3>
                  <p className="text-muted-foreground">
                    Get the latest gold sector updates and investment tips from Yawatu straight to your inbox
                  </p>
                  <form onSubmit={handleNewsletterSignup} className="flex gap-2 max-w-md mx-auto">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={emailSignup}
                      onChange={(e) => setEmailSignup(e.target.value)}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                      required
                    />
                    <Button type="submit">
                      Subscribe
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground">
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default News;