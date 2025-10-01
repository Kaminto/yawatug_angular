import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Gift, TrendingUp, Share, Award, Coins } from "lucide-react";
import referralsImage from "@/assets/images/icons/referrals.jpg";

const ReferralProgram = () => {
  const referralTiers = [
    {
      tier: "Bronze",
      referrals: "1-9",
      commission: "5%",
      bonus: "100 UGX per referral",
      benefits: ["Basic referral tracking", "Monthly payouts", "Email support"]
    },
    {
      tier: "Silver", 
      referrals: "10-24",
      commission: "7%",
      bonus: "200 UGX per referral",
      benefits: ["Advanced analytics", "Bi-weekly payouts", "Priority support", "Marketing materials"]
    },
    {
      tier: "Gold",
      referrals: "25-49", 
      commission: "10%",
      bonus: "500 UGX per referral",
      benefits: ["Premium dashboard", "Weekly payouts", "Dedicated support", "Custom referral codes", "Bonus shares"]
    },
    {
      tier: "Platinum",
      referrals: "50+",
      commission: "15%",
      bonus: "1,000 UGX per referral", 
      benefits: ["VIP treatment", "Daily payouts", "Personal account manager", "Exclusive events", "Maximum bonuses"]
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
      description: "When someone uses your code to purchase shares, they become your successful referral.",
      icon: TrendingUp
    },
    {
      step: 4,
      title: "Earn Commissions",
      description: "Receive your commission and bonuses based on their investment amount and your tier level.",
      icon: Coins
    }
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Bronze": return "bg-orange-600";
      case "Silver": return "bg-gray-500";
      case "Gold": return "bg-yellow-500"; 
      case "Platinum": return "bg-purple-600";
      default: return "bg-gray-500";
    }
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
                Earn commissions and bonuses by referring friends and family to invest in Yawatu shares. The more you refer, the more you earn!
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

      {/* Commission Structure */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Referral Tiers & Commissions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {referralTiers.map((tier, index) => (
              <Card key={index} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${getTierColor(tier.tier)}`} />
                <CardHeader className="text-center">
                  <Badge className={`${getTierColor(tier.tier)} text-white w-fit mx-auto mb-2`}>
                    {tier.tier}
                  </Badge>
                  <CardTitle className="text-xl">{tier.referrals} Referrals</CardTitle>
                  <div className="text-3xl font-bold text-primary">{tier.commission}</div>
                  <p className="text-sm text-muted-foreground">Commission Rate</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="font-semibold text-lg">{tier.bonus}</div>
                    <p className="text-sm text-muted-foreground">Sign-up Bonus</p>
                  </div>
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

      {/* Referral Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Join Our Referral Program?</h2>
            <p className="text-xl text-muted-foreground">
              Our referral program offers industry-leading commissions and benefits to help you maximize your earnings.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Gift className="h-12 w-12 text-primary mb-4" />
                <CardTitle>High Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Earn up to 15% commission on every successful referral, plus additional sign-up bonuses for each new investor.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Award className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Tier Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advance through our tier system to unlock higher commission rates and exclusive benefits.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Passive Income</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Build a network of investors and earn ongoing commissions from their continued investments and reinvestments.
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
            Join our referral program today and start earning commissions by sharing Yawatu investment opportunities.
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