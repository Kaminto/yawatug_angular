import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Wallet, TrendingUp } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      step: "1",
      icon: Smartphone,
      title: "Register",
      description: "Sign up with your phone number in minutes",
      emoji: "📱",
      details: "Quick & easy mobile registration"
    },
    {
      step: "2", 
      icon: Wallet,
      title: "Fund Wallet",
      description: "Use Mobile Money (MTN, Airtel, M-Pesa) or Bank",
      emoji: "💳",
      details: "All payment methods accepted"
    },
    {
      step: "3",
      icon: TrendingUp,
      title: "Buy Shares",
      description: "Instantly become a shareholder and monitor your investment",
      emoji: "📈",
      details: "Real-time portfolio tracking"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            How It <span className="gold-text">Works</span> 
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            <span className="hidden sm:inline">Start investing in Uganda's mining future with these 3 simple steps</span>
            <span className="sm:hidden">3 simple steps to start investing</span>
          </p>
        </div>

        {/* Mobile-First Card Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <Card key={index} className="elegant-card text-center group hover:scale-105 transition-all duration-300 mobile-optimized-button">
              <CardContent className="p-6 sm:p-8">
                {/* Step Number */}
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                  {step.step}
                </div>
                
                {/* Icon & Emoji */}
                <div className="mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl">{step.emoji}</div>
                </div>

                {/* Content */}
                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-foreground">{step.title}</h3>
                <p className="text-muted-foreground mb-2 leading-relaxed">
                  {step.description}
                </p>
                <p className="text-sm text-primary font-medium">
                  {step.details}
                </p>

                {/* Connection Line for Desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30 transform -translate-y-1/2"></div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile Swipe Indicator */}
        <div className="md:hidden text-center mt-8">
          <p className="text-sm text-muted-foreground">
            👆 Swipe or scroll to see all steps
          </p>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <div className="bg-primary/10 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-2">Ready to Start? 🚀</h3>
            <p className="text-muted-foreground text-sm">
              Join 500+ investors already growing their wealth with Yawatu
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;