import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, ArrowRight, Star, Award, Target } from "lucide-react";
import PublicShareOrderForm from "@/components/public/PublicShareOrderForm";

const AppDownloadSection = () => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  const growthStats = [
    { icon: TrendingUp, label: "Annual Growth", value: "25%", description: "Consistent year-over-year growth" },
    { icon: Users, label: "Young Investors", value: "80%", description: "Of our investors are under 35" },
    { icon: Award, label: "East African Reach", value: "5+", description: "Countries with active investors" },
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Invest and <span className="gold-text">Grow With Us</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join a new generation of young East African investors building wealth through ethical mining investments
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {growthStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{stat.label}</h3>
                    <p className="text-sm text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Target className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold text-foreground">Ready to Start Growing?</h3>
              </div>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of young East African investors who are building their financial future with Yawatu Minerals. 
                Start with as little as UGX 50,000 and watch your investment grow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="gold-button"
                  onClick={() => setShowOrderForm(true)}
                >
                  Start Investing Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Star className="mr-2 h-5 w-5" />
                  Learn More
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

export default AppDownloadSection;