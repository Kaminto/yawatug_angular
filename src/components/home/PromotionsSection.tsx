import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Users, Star } from "lucide-react";
import referralBonus from "@/assets/images/promotions/referral-bonus.jpg";
import bulkPurchase from "@/assets/images/promotions/bulk-purchase.jpg";
import earlyInvestor from "@/assets/images/promotions/early-investor.jpg";

const PromotionsSection = () => {
  const promotions = [
    {
      icon: Gift,
      title: "Referral Bonus",
      description: "Earn 5% commission for each referral who buys shares",
      image: referralBonus
    },
    {
      icon: Users,
      title: "Bulk Purchase Reward", 
      description: "Buy 1000+ shares and get 3% bonus shares",
      image: bulkPurchase
    },
    {
      icon: Star,
      title: "Early Investor Benefit",
      description: "Priority access to new mining projects",
      image: earlyInvestor
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Current Promotions</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {promotions.map((promo, index) => {
            const Icon = promo.icon;
            return (
              <Card key={index} className="border border-primary/20 hover:border-primary/40 transition-colors overflow-hidden group">
                <div className="relative h-48">
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <div className="bg-background/90 backdrop-blur-sm p-2 rounded-full">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold mb-3">{promo.title}</h3>
                  <p className="text-muted-foreground mb-6">{promo.description}</p>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                    Learn more
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PromotionsSection;