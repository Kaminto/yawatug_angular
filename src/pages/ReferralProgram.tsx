import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Gift, TrendingUp, Share, Award, Coins, Trophy } from "lucide-react";
import referralsImage from "@/assets/images/icons/referrals.jpg";

const ReferralProgram = () => {
  const referralTiers = [
    {
      tier: "Level 1",
      type: "Cash Commission",
      reward: "5%",
      description: "Direct referral commission",
      benefits: ["Cash on pool purchases", "Instant payouts after KYC", "90-day eligibility"]
    },
    {
      tier: "Level 2", 
      type: "Credit Rewards",
      reward: "1 Credit / 10 Shares",
      description: "Network activity rewards",
      benefits: ["Convert to shares", "Enter Grand Draw", "Accumulate over time", "No expiry"]
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Get Your Referral Code",
      description: "Sign up and receive your unique referral code or link to share with friends and family.",
      icon: Share
    },
    {
      step: 2,
      title: "Share & Invite",
      description: "Share your referral code through social media, email, or direct messaging to potential investors.",
      icon: Users
    },
    {
      step: 3,
      title: "They Invest",
      description: "When someone uses your code to purchase shares from the pool, you earn commission and credits.",
      icon: TrendingUp
    },
    {
      step: 4,
      title: "Earn & Win",
      description: "Receive cash commissions and credits. Use credits to enter draws or convert to shares.",
      icon: Coins
    }
  ];

  const getTierColor = (tier: string) => {
    if (tier.includes("Level 1")) return "bg-green-600";
    if (tier.includes("Level 2")) return "bg-purple-600";
    return "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Referral Program
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Earn cash commissions, collect credits, and win prizes through our Grand Draw system. The more you refer, the more you earn and win!
              </p>
              <div className="flex gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/register-new'}>
                  Start Referring
                </Button>
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src={referralsImage}
                alt="Referral Program"
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reward Structure */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Two-Tier Reward System</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {referralTiers.map((tier, index) => (
              <Card key={index} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${getTierColor(tier.tier)}`} />
                <CardHeader className="text-center">
                  <Badge className={`${getTierColor(tier.tier)} text-white w-fit mx-auto mb-2`}>
                    {tier.tier}
                  </Badge>
                  <CardTitle className="text-xl">{tier.type}</CardTitle>
                  <div className="text-3xl font-bold text-primary">{tier.reward}</div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Benefits:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i}>• {benefit}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                      {step.step}
                    </div>
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grand Draw Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold mb-4">Grand Draw System</h2>
            <p className="text-xl text-muted-foreground">
              Stake your credits for a chance to win big! 3 winners share the prize pool every draw.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="text-5xl mb-2">🥇</div>
                <CardTitle>1st Prize</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">50%</div>
                <p className="text-muted-foreground mt-2">
                  Of prize pool in shares
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="text-5xl mb-2">🥈</div>
                <CardTitle>2nd Prize</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">30%</div>
                <p className="text-muted-foreground mt-2">
                  Of prize pool in shares
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="text-5xl mb-2">🥉</div>
                <CardTitle>3rd Prize</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">20%</div>
                <p className="text-muted-foreground mt-2">
                  Of prize pool in shares
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Referral Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Join Our Referral Program?</h2>
            <p className="text-xl text-muted-foreground">
              Our enhanced referral program offers cash commissions, credit rewards, and exciting prize draws to maximize your earnings.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Gift className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Dual Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Earn cash commissions from pool purchases AND collect credits from network activity for maximum benefits.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Trophy className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Grand Draw Prizes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Stake credits to enter draws with transparent results. Win shares worth up to 50% of the prize pool!
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Transparent & Fair</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  KYC-verified rewards ensure fairness. Draw results are public and archived for complete transparency.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Referral Success Stories</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">James Mutumba</h4>
                    <p className="text-sm text-muted-foreground">Gold Tier Referrer</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  "I've earned over 2.5M UGX in commissions by referring 30+ investors. The program has become a significant income source for me."
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Sarah Nakato</h4>
                    <p className="text-sm text-muted-foreground">Platinum Tier Referrer</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  "Reaching Platinum tier gave me access to exclusive benefits and higher commissions. My monthly referral income now exceeds my salary!"
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">David Ssebunya</h4>
                    <p className="text-sm text-muted-foreground">Silver Tier Referrer</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  "Started with just 5 referrals and now I'm consistently earning commissions. The tracking system makes it easy to monitor my progress."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join our enhanced referral program today and start earning commissions, credits, and winning prizes.
          </p>
          <Button size="lg" variant="secondary" onClick={() => window.location.href = '/register-new'}>
            Get Your Referral Code
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ReferralProgram;