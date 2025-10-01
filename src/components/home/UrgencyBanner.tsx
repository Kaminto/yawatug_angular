import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, TrendingUp, Users } from "lucide-react";
import PublicShareOrderForm from "@/components/public/PublicShareOrderForm";

const UrgencyBanner = () => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 7,
    hours: 12,
    minutes: 30,
    seconds: 45
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="container mx-auto px-4">
        <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
          <CardContent className="py-6">
            <div className="text-center">
              <div className="flex justify-center items-center gap-2 mb-4">
                <Badge variant="destructive" className="animate-pulse">
                  🔥 LIMITED TIME
                </Badge>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  634 investors joined today
                </Badge>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
                First 1,000 Investors Get 5% Bonus Shares!
              </h3>
              
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Don't miss your chance to own part of Uganda's mining future at ground-floor prices.
              </p>

              <div className="flex justify-center items-center gap-4 mb-6">
                <Timer className="h-5 w-5 text-primary" />
                <div className="flex gap-2 text-center">
                  <div className="bg-background/80 rounded px-2 py-1">
                    <div className="text-lg font-bold">{timeLeft.days}</div>
                    <div className="text-xs">DAYS</div>
                  </div>
                  <div className="bg-background/80 rounded px-2 py-1">
                    <div className="text-lg font-bold">{timeLeft.hours}</div>
                    <div className="text-xs">HRS</div>
                  </div>
                  <div className="bg-background/80 rounded px-2 py-1">
                    <div className="text-lg font-bold">{timeLeft.minutes}</div>
                    <div className="text-xs">MIN</div>
                  </div>
                  <div className="bg-background/80 rounded px-2 py-1">
                    <div className="text-lg font-bold">{timeLeft.seconds}</div>
                    <div className="text-xs">SEC</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  className="gold-button"
                  onClick={() => setShowOrderForm(true)}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  🚀 Secure Your Spot Now
                </Button>
                <Button variant="outline" size="lg">
                  View Bonus Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <PublicShareOrderForm 
        open={showOrderForm} 
        onClose={() => setShowOrderForm(false)} 
      />
    </section>
  );
};

export default UrgencyBanner;