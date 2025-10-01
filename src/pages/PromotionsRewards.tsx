import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, Users, Zap, Calendar, Trophy } from "lucide-react";
import promotionsImage from "@/assets/images/icons/promotions.jpg";
import rewardsImage from "@/assets/images/icons/rewards.jpg";

const PromotionsRewards = () => {
  const currentPromotions = [
    {
      title: "New Investor Bonus",
      description: "First-time investors get 10% bonus shares on their initial purchase of 1,000 shares or more",
      validUntil: "June 30, 2024",
      type: "Limited Time",
      icon: Gift,
      image: promotionsImage
    },
    {
      title: "Bulk Purchase Reward",
      description: "Buy 5,000+ shares in a single transaction and receive 5% bonus shares plus priority dividend status",
      validUntil: "Ongoing",
      type: "Bulk Deal",
      icon: Star,
      image: rewardsImage
    },
    {
      title: "Loyalty Program",
      description: "Hold shares for 12+ months and unlock exclusive rewards including early access to new projects",
      validUntil: "Ongoing",
      type: "Loyalty",
      icon: Trophy,
      image: promotionsImage
    }
  ];

  const rewardTiers = [
    {
      tier: "Bronze",
      requirement: "10+ shares held",
      benefits: ["Monthly newsletter", "Basic investment insights", "Standard customer support"],
      color: "bg-orange-600"
    },
    {
      tier: "Silver", 
      requirement: "100+ shares held",
      benefits: ["Quarterly reports", "Investment webinars", "Priority support", "5% referral bonus"],
      color: "bg-gray-500"
    },
    {
      tier: "Gold",
      requirement: "1,000+ shares held", 
      benefits: ["Exclusive events", "Personal advisor", "Advanced analytics", "10% referral bonus", "Early project access"],
      color: "bg-yellow-500"
    },
    {
      tier: "Platinum",
      requirement: "10,000+ shares held",
      benefits: ["VIP events", "Board meeting access", "Custom strategies", "15% referral bonus", "Dividend reinvestment options"],
      color: "bg-purple-600"
    }
  ];

  const seasonalOffers = [
    {
      title: "Holiday Special",
      period: "December 2024",
      offer: "20% bonus shares on all purchases over 2,000 shares",
      status: "Upcoming"
    },
    {
      title: "New Year Investment Drive",
      period: "January 2024", 
      offer: "Zero transaction fees for the first month",
      status: "Upcoming"
    },
    {
      title: "Easter Promotion",
      period: "March 2024",
      offer: "Matching bonus shares up to 500 shares for family referrals",
      status: "Active"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Promotions & Rewards
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover exclusive promotions, seasonal offers, and loyalty rewards designed to maximize your investment returns with Yawatu Mining.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              View Current Offers
            </Button>
          </div>
        </div>
      </section>

      {/* Current Promotions */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Current Promotions</h2>
          <div className="space-y-8">
            {currentPromotions.map((promo, index) => {
              const Icon = promo.icon;
              return (
                <Card key={index} className="overflow-hidden">
                  <div className="grid md:grid-cols-3 gap-0">
                    <div className="relative h-64 md:h-auto">
                      <img
                        src={promo.image}
                        alt={promo.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-primary text-primary-foreground">
                          {promo.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="md:col-span-2 p-6">
                      <CardHeader className="p-0 mb-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-primary/10 p-3 rounded-full">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{promo.title}</CardTitle>
                            <p className="text-muted-foreground">{promo.description}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Valid until: {promo.validUntil}</span>
                          </div>
                          <Button className="bg-primary hover:bg-primary/90">
                            Claim Offer
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reward Tiers */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Investor Reward Tiers</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rewardTiers.map((tier, index) => (
              <Card key={index} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${tier.color}`} />
                <CardHeader className="text-center">
                  <Badge className={`${tier.color} text-white w-fit mx-auto mb-2`}>
                    {tier.tier}
                  </Badge>
                  <CardTitle className="text-lg">{tier.requirement}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm mb-3">Benefits:</h4>
                    <ul className="text-xs text-muted-foreground space-y-2">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Seasonal Offers */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Seasonal Offers</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {seasonalOffers.map((offer, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{offer.title}</CardTitle>
                    <Badge variant={offer.status === "Active" ? "default" : "secondary"}>
                      {offer.status}
                    </Badge>
                  </div>
                  <p className="text-primary font-semibold">{offer.period}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{offer.offer}</p>
                  <Button 
                    variant={offer.status === "Active" ? "default" : "outline"}
                    className="w-full"
                    disabled={offer.status !== "Active"}
                  >
                    {offer.status === "Active" ? "Claim Now" : "Coming Soon"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Earn Rewards */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">How to Earn Rewards</h2>
            <p className="text-xl text-muted-foreground">
              Multiple ways to earn bonuses and unlock exclusive benefits as a Yawatu investor.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Refer Friends</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Earn commission bonuses and unlock tier benefits by referring new investors to our platform.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Increase Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Purchase more shares to advance through reward tiers and unlock premium benefits and higher returns.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Stay Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Regular engagement and long-term holding periods qualify you for loyalty bonuses and exclusive offers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Never Miss a Promotion</h2>
          <p className="text-xl mb-8 opacity-90">
            Subscribe to our newsletter to be the first to know about new promotions, seasonal offers, and exclusive rewards.
          </p>
          <Button size="lg" variant="secondary">
            Subscribe for Updates
          </Button>
        </div>
      </section>
    </div>
  );
};

export default PromotionsRewards;