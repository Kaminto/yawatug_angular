import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, Shield } from "lucide-react";

const PLCStatusBar = () => {
  return (
    <section className="bg-gradient-to-r from-yawatu-gold/10 to-yawatu-gold-dark/10 border-y border-yawatu-gold/20 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-6 items-center text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-yawatu-gold" />
            <span className="text-foreground">PLC Registered</span>
            <Badge variant="secondary" className="bg-yawatu-gold/20 text-yawatu-gold-dark">
              URSB Approved
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-yawatu-gold" />
            <span className="text-foreground">Share Returns Guaranteed</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-yawatu-gold" />
            <span className="text-foreground">Digital-First Mining Platform</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-foreground">🏆 Uganda's Premier Mining Investment PLC</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PLCStatusBar;