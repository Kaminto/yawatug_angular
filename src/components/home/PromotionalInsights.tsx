import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Trophy, DollarSign, Bell, Crown, Medal, Award } from "lucide-react";
import PublicShareOrderForm from "@/components/public/PublicShareOrderForm";

const PromotionalInsights = () => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  // Mock data - in real app, this would come from API
  const topReferrers = [
    { rank: 1, name: "Sarah M.", referrals: 47, earnings: "UGX 2,350,000" },
    { rank: 2, name: "John K.", referrals: 39, earnings: "UGX 1,950,000" },
    { rank: 3, name: "Mary A.", referrals: 35, earnings: "UGX 1,750,000" },
    { rank: 4, name: "David L.", referrals: 28, earnings: "UGX 1,400,000" },
    { rank: 5, name: "Grace N.", referrals: 24, earnings: "UGX 1,200,000" },
  ];

  const investmentHighlights = {
    today: { amount: "UGX 15,750,000", investor: "Michael T." },
    week: { amount: "UGX 89,200,000", investor: "Investment Club Pro" },
    month: { amount: "UGX 450,000,000", investor: "Corporate Partners Ltd" },
  };

  const breakingNews = [
    {
      title: "New Diamond Mining Site Operational",
      summary: "Our latest facility in Kasese is now fully operational, increasing capacity by 35%",
      type: "success",
      time: "2 hours ago"
    },
    {
      title: "Q4 Dividend Distribution Announcement",
      summary: "Enhanced returns of 12.5% confirmed for all shareholders this quarter",
      type: "info", 
      time: "1 day ago"
    },
    {
      title: "Partnership with International Buyers",
      summary: "Strategic agreements secured with European buyers, boosting export revenues",
      type: "success",
      time: "3 days ago"
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <Trophy className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">
            <span className="gold-text">🔥 Limited Time:</span> First 1,000 Investors
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-4">
            Get Priority Shareholder Status • Extra 5% Bonus Shares • Secure Your Spot Now!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Referrers */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="hidden sm:inline">Top Referral Champions</span>
                <span className="sm:hidden">Top Referrers</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topReferrers.map((referrer) => (
                <div key={referrer.rank} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {getRankIcon(referrer.rank)}
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{referrer.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{referrer.referrals}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-xs sm:text-sm">{referrer.earnings}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4">
                💰 Earn When Friends Join
              </Button>
            </CardContent>
          </Card>

          {/* Investment Highlights */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="hidden sm:inline">Investment Highlights</span>
                <span className="sm:hidden">Top Investments</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Today's Top</span>
                    <Badge variant="secondary">24h</Badge>
                  </div>
                  <p className="font-bold text-lg">{investmentHighlights.today.amount}</p>
                  <p className="text-sm text-muted-foreground">by {investmentHighlights.today.investor}</p>
                </div>

                <div className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">This Week</span>
                    <Badge variant="secondary">7d</Badge>
                  </div>
                  <p className="font-bold text-lg">{investmentHighlights.week.amount}</p>
                  <p className="text-sm text-muted-foreground">by {investmentHighlights.week.investor}</p>
                </div>

                <div className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">This Month</span>
                    <Badge variant="secondary">30d</Badge>
                  </div>
                  <p className="font-bold text-lg">{investmentHighlights.month.amount}</p>
                  <p className="text-sm text-muted-foreground">by {investmentHighlights.month.investor}</p>
                </div>
              </div>
              <Button 
                className="w-full"
                onClick={() => setShowOrderForm(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                💎 Buy Shares Now
              </Button>
            </CardContent>
          </Card>

          {/* Breaking News */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="hidden sm:inline">Breaking News & Updates</span>
                <span className="sm:hidden">News</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {breakingNews.map((news, index) => (
                <div key={index} className="p-3 rounded-lg bg-background/50 border-l-4 border-primary/30">
                  <div className="flex items-start justify-between mb-2">
                    <Badge 
                      variant={news.type === 'success' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {news.type === 'success' ? 'Growth' : 'Update'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{news.time}</span>
                  </div>
                  <h4 className="font-medium text-sm mb-1 line-clamp-2">{news.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3">{news.summary}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                View All Updates
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action Banner */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-8">
              <h3 className="text-xl sm:text-2xl font-bold mb-4">
                Imagine Being an Early Shareholder in a Billion-Dollar Company
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-lg mx-auto px-4">
                Yawatu is just beginning - your shares are at ground-floor price. For students, workers, hustlers, and entrepreneurs alike.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="px-8"
                  onClick={() => setShowOrderForm(true)}
                >
                  📲 Start with 10 Shares
                </Button>
                <Button variant="outline" size="lg" className="px-8">
                  View All Offers
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Public Order Form */}
      <PublicShareOrderForm 
        open={showOrderForm} 
        onClose={() => setShowOrderForm(false)} 
      />
    </section>
  );
};

export default PromotionalInsights;