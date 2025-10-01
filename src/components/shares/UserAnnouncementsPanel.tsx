
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Megaphone, TrendingUp, AlertCircle, Calendar, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserAnnouncementsPanelProps {
  userId: string;
}

const UserAnnouncementsPanel: React.FC<UserAnnouncementsPanelProps> = ({
  userId
}) => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [marketState, setMarketState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnnouncementsData();
    loadMarketState();
  }, [userId]);

  const loadAnnouncementsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(20);

      if (!error) {
        setAnnouncements(data || []);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketState = async () => {
    try {
      // Load current market state
      const { data } = await supabase.rpc('get_current_market_state');
      if (data && data.length > 0) {
        setMarketState(data[0]);
      }
    } catch (error) {
      console.error('Error loading market state:', error);
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'dividend':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'market':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      case 'system':
        return <Bell className="h-5 w-5 text-orange-600" />;
      default:
        return <Megaphone className="h-5 w-5 text-purple-600" />;
    }
  };

  const getAnnouncementPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diffInHours = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return posted.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* News Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">News & Updates</h2>
          <p className="text-muted-foreground">Stay informed about market updates and company announcements</p>
        </div>
        <Button variant="outline" onClick={loadAnnouncementsData}>
          <Bell className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Market Status Alert */}
      {marketState && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium">Current Market State</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {marketState.state_type?.replace('_', ' ')} • {marketState.config_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  P2P: {marketState.p2p_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Badge variant="outline">
                  Auto-Buyback: {marketState.auto_buyback_enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* News Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">All News</TabsTrigger>
          <TabsTrigger value="market">Market Updates</TabsTrigger>
          <TabsTrigger value="dividend">Dividends</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No announcements available</p>
                <p className="text-sm text-gray-400">Check back later for company updates and news</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <Card 
                  key={announcement.id} 
                  className={`border-l-4 ${getAnnouncementPriorityColor(announcement.priority)}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getAnnouncementIcon(announcement.announcement_type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{announcement.title}</h3>
                            <Badge variant={announcement.priority === 'high' ? 'destructive' : 'secondary'}>
                              {announcement.priority}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3 line-clamp-3">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatTimeAgo(announcement.published_at)}
                            </span>
                            <Badge variant="outline" className="capitalize">
                              {announcement.announcement_type || 'General'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <div className="space-y-4">
            {announcements
              .filter(a => a.announcement_type === 'market')
              .map((announcement) => (
                <Card key={announcement.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                        <p className="text-muted-foreground mb-3">{announcement.content}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeAgo(announcement.published_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="dividend" className="space-y-4">
          <div className="space-y-4">
            {announcements
              .filter(a => a.announcement_type === 'dividend')
              .map((announcement) => (
                <Card key={announcement.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                        <p className="text-muted-foreground mb-3">{announcement.content}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeAgo(announcement.published_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Investment Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Understanding Dividends</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Learn how dividend payments work and how they affect your portfolio.
                  </p>
                  <Button size="sm" variant="outline">Read More</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Share Trading Basics</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Essential concepts for buying and selling shares effectively.
                  </p>
                  <Button size="sm" variant="outline">Read More</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Portfolio Diversification</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Strategies for building a balanced investment portfolio.
                  </p>
                  <Button size="sm" variant="outline">Read More</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Market Analysis</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Tools and techniques for analyzing market trends and opportunities.
                  </p>
                  <Button size="sm" variant="outline">Read More</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserAnnouncementsPanel;
