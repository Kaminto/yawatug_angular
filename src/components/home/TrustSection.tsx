import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Award, Users, Zap } from "lucide-react";

const TrustSection = () => {
  const trustFactors = [
    {
      icon: Shield,
      title: "🇺🇬 Uganda Registered",
      description: "Licensed under Ministry of Energy & Mineral Development",
      shortDesc: "Government licensed & regulated",
      badge: "Official"
    },
    {
      icon: Users,
      title: "💳 Mobile Money Accepted",
      description: "MTN, Airtel, M-Pesa payments for easy access to all Ugandans",
      shortDesc: "All mobile money accepted",
      badge: "Convenient"
    },
    {
      icon: Award,
      title: "📈 Guaranteed Returns",
      description: "Proven track record with consistent 15% annual returns for investors",
      shortDesc: "15% guaranteed annual returns",
      badge: "Profitable"
    },
    {
      icon: Zap,
      title: "📱 100% Online",
      description: "Invest anytime, anywhere on your phone—no brokers, no paperwork",
      shortDesc: "Complete mobile experience",
      badge: "Simple"
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Why <span className="gold-text">East Africans Trust</span> Yawatu
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            <span className="hidden sm:inline">We are a local Ugandan company giving East Africans a chance to own part of their mineral wealth 💎</span>
            <span className="sm:hidden">Local company, trusted by East Africans 🌍</span>
          </p>
          
          {/* Mobile Money Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="flex items-center gap-2 bg-card rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm font-medium">Payments:</span>
              <span className="text-orange-600 font-bold text-sm">MTN</span>
              <span className="text-red-500 font-bold text-sm">Airtel</span>
              <span className="text-green-600 font-bold text-sm">M-Pesa</span>
            </div>
            <div className="bg-card rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm font-medium">✅ Bank Transfer</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {trustFactors.map((factor, index) => (
            <Card key={index} className="elegant-card text-center hover:scale-105 transition-transform duration-300 mobile-optimized-button group">
              <CardContent className="p-6 sm:p-8">
                {/* Badge */}
                <div className="flex justify-center mb-4">
                  <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
                    {factor.badge}
                  </span>
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <factor.icon className="h-8 w-8 text-primary" />
                </div>
                
                {/* Title */}
                <h3 className="text-lg sm:text-xl font-semibold mb-4">{factor.title}</h3>
                
                {/* Description - Responsive */}
                <p className="text-muted-foreground leading-relaxed">
                  <span className="hidden sm:block">{factor.description}</span>
                  <span className="sm:hidden">{factor.shortDesc}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Success Stories Section */}
        <div className="mt-16 bg-card rounded-lg p-6 sm:p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-6">
            <span className="gold-text">Local Success Stories</span> 📖
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary-foreground font-bold">JM</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                "Started with 100,000 UGX. Now earning monthly dividends!" 
              </p>
              <p className="text-xs font-medium">James, Kampala</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary-foreground font-bold">AN</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                "Mobile Money made it so easy to start investing."
              </p>
              <p className="text-xs font-medium">Aisha, Entebbe</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;