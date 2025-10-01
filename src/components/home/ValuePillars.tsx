import React from "react";
import { TrendingUp, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
const ValuePillars = () => {
  const benefits = [{
    icon: TrendingUp,
    title: "📈 Grow Your Wealth",
    description: "Earn from share price increases and guaranteed 15% annual dividends",
    shortDescription: "15% guaranteed returns + growth",
    emoji: "💰",
    cta: "Calculate My Returns"
  }, {
    icon: Zap,
    title: "⏱ Quick & Easy",
    description: "Invest in minutes, anytime on your phone—no brokers, no paperwork needed",
    shortDescription: "Invest in minutes on mobile",
    emoji: "📱",
    cta: "Start Now"
  }, {
    icon: Shield,
    title: "💳 Secure Wallet",
    description: "All your transactions recorded and accessible 24/7 with bank-level security",
    shortDescription: "Bank-level security",
    emoji: "🔒",
    cta: "View Security"
  }, {
    icon: Users,
    title: "🤝 Invite Friends",
    description: "Earn referral rewards when friends join—build wealth together with your network",
    shortDescription: "Earn referral bonuses",
    emoji: "🎁",
    cta: "Share & Earn"
  }];
  return <section className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
              Key <span className="gold-text">Benefits</span> for You 🌟
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              <span className="hidden sm:inline">Why 500+ East Africans choose Yawatu for their mining investments</span>
              <span className="sm:hidden">Why investors choose Yawatu 💎</span>
            </p>
          </div>

          {/* Mobile-First Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return <div key={index} className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-all duration-300 group mobile-optimized-button">
                  {/* Emoji & Icon Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">{benefit.emoji}</div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-bold mb-3 text-foreground">{benefit.title}</h3>
                  
                  {/* Description - Mobile Optimized */}
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                    <span className="hidden sm:block">{benefit.description}</span>
                    <span className="sm:hidden">{benefit.shortDescription}</span>
                  </p>
                  
                  {/* CTA Button */}
                  <Button variant="outline" size="sm" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs">
                    {benefit.cta}
                  </Button>
                </div>;
          })}
          </div>
          
          {/* Bottom CTA Card */}
          <div className="mt-12 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-2">🌍 100% Online Experience</h3>
            <p className="text-muted-foreground text-sm mb-4">No brokers, no paperwork, office visits(optional), everything on your phone!</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full">Mobile First</span>
              <span className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full">East African</span>
              <span className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full">Guaranteed Returns</span>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default ValuePillars;