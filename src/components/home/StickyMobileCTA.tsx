import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import PublicShareOrderForm from "@/components/public/PublicShareOrderForm";

const StickyMobileCTA = () => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const { user } = useAuth();

  // Only show on mobile and when user is not logged in
  if (user) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-4 safe-area-pb md:hidden">
        <div className="flex gap-3">
          <Button 
            className="flex-1 gold-button mobile-optimized-button font-semibold"
            onClick={() => setShowOrderForm(true)}
          >
            📲 Register & Buy Shares
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="default"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground mobile-optimized-button"
            asChild
          >
            <Link to="/login">
              👤
            </Link>
          </Button>
        </div>
        
        {/* Quick Trust Indicators */}
        <div className="flex justify-center items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>🔒 Secure</span>
          <span>🇺🇬 Licensed</span>
          <span>📱 Mobile Money</span>
          <span>📈 15% Returns</span>
        </div>
      </div>

      {/* Add bottom padding to prevent content overlap */}
      <div className="h-20 md:hidden"></div>

      {/* Order Form */}
      <PublicShareOrderForm 
        open={showOrderForm} 
        onClose={() => setShowOrderForm(false)} 
      />
    </>
  );
};

export default StickyMobileCTA;