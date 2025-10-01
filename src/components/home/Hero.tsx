import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Phone, ArrowRight, Users, Shield, TrendingUp } from "lucide-react";
import PublicShareOrderForm from "@/components/public/PublicShareOrderForm";

const Hero = () => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden charcoal-section">
      {/* Mining Pattern Background */}
      <div className="mining-pattern absolute inset-0"></div>
      
      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Trust Indicators - Mobile: Promotions Button, Desktop: Trust badges */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-6 sm:mb-8 text-xs sm:text-sm">
            {/* Mobile: Promotions Button */}
            <div className="sm:hidden">
              <Button 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => setShowOrderForm(true)}
              >
                Our Best Offers for Today
              </Button>
            </div>
            
            {/* Desktop: Trust Indicators */}
            <div className="hidden sm:flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-secondary-foreground">PLC Registered</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-secondary-foreground">East African Mineral Investment</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-secondary-foreground">Guaranteed Returns</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground mb-4 sm:mb-6 leading-tight">
              <span className="block gold-text mb-2">Own Shares in Uganda's</span>
              <span className="block text-secondary-foreground">Mining Future – Start Today! 🚀</span>
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-secondary-foreground/80 mb-4 sm:mb-6 max-w-3xl mx-auto leading-relaxed px-4">
              <span className="hidden sm:inline">Yawatu Minerals & Mining Ltd is giving East Africans the chance to invest directly in real mineral wealth. Register online now—simple, fast, and secure on your phone. 📱</span>
              <span className="sm:hidden">Register online & invest in Uganda's mining wealth 💎</span>
            </p>
            
            {/* Mobile Money Trust Indicators */}
            <div className="flex justify-center items-center gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <span className="text-xs sm:text-sm text-secondary-foreground font-medium">Pay with:</span>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-orange-400">MTN</span>
                  <span className="text-xs font-bold text-red-400">Airtel</span>
                  <span className="text-xs font-bold text-green-400">M-Pesa</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <span className="text-xs sm:text-sm text-secondary-foreground font-medium">💳 Bank Transfer</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 mb-6 sm:mb-8 max-w-2xl mx-auto">
              <p className="text-sm sm:text-base text-secondary-foreground font-medium">
                <span className="text-primary">Ugandan Registered Company</span> • Licensed by Ministry of Energy • 100% Secure 🔒
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="gold-button text-lg px-8 py-4 h-auto mobile-optimized-button"
              onClick={() => setShowOrderForm(true)}
            >
              📲 Register & Buy Shares
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg px-8 py-4 h-auto mobile-optimized-button" asChild>
              <Link to="/login">
                👤 Login to My Account
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-6 soft-shadow">
              <div className="text-xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">500+</div>
              <div className="text-secondary-foreground text-xs sm:text-sm">
                <span className="hidden sm:inline">Active Investors</span>
                <span className="sm:hidden">Investors</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-6 soft-shadow">
              <div className="text-xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">15%</div>
              <div className="text-secondary-foreground text-xs sm:text-sm">
                <span className="hidden sm:inline">Guaranteed Returns</span>
                <span className="sm:hidden">Returns</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-6 soft-shadow">
              <div className="text-xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">100%</div>
              <div className="text-secondary-foreground text-xs sm:text-sm">
                <span className="hidden sm:inline">Ethical Mining</span>
                <span className="sm:hidden">Ethical</span>
              </div>
            </div>
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

export default Hero;