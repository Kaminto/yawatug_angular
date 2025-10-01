import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Smartphone, DollarSign, TrendingUp, ArrowRight } from "lucide-react";
import PublicShareOrderForm from "@/components/public/PublicShareOrderForm";

const InvestmentCTA = () => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  return (
    <section className="py-20 charcoal-section relative overflow-hidden">
      <div className="mining-pattern absolute inset-0"></div>
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-secondary-foreground">
              <span className="gold-text">From Ground to Gold</span> 
              <span className="block">Your Wealth in the Making</span>
            </h2>
            <p className="text-xl text-secondary-foreground/80 max-w-3xl mx-auto">
              Turning Everyday Ugandans into Shareholders. Invest Small. Grow Big. Build Legacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-white/5 border-primary/20 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-secondary-foreground">Minimum 10 Shares</h3>
                <p className="text-secondary-foreground/70">Start small with just 10 shares. Installment payment plans available for all investors.</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-primary/20 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-secondary-foreground">Trade Anytime</h3>
                <p className="text-secondary-foreground/70">Buy and sell your shares through the app - complete liquidity on your terms</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-primary/20 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-secondary-foreground">Earn & Withdraw</h3>
                <p className="text-secondary-foreground/70">Receive dividends as the company grows - withdraw or reinvest on your terms</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="gold-button text-lg px-8 py-4 h-auto"
                onClick={() => setShowOrderForm(true)}
              >
                🚀 Claim Your Shares Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg px-8 py-4 h-auto" asChild>
                <Link to="/contact">
                  Speak to an Advisor
                </Link>
              </Button>
            </div>
            <p className="text-sm text-secondary-foreground/60 mt-6">
              Minimum 10 shares • Installment plans available • Be part of Uganda's mining future
            </p>
          </div>
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

export default InvestmentCTA;