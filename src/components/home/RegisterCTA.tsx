
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PublicShareOrderForm from "@/components/public/PublicShareOrderForm";

const RegisterCTA = () => {
  const [showOrderForm, setShowOrderForm] = useState(false);

  return (
    <section className="py-20 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-yawatu-gold/5"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to <span className="gold-text">Join Yawatu</span> as a Shareholder?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Create your account today and start investing in Uganda's mining future.
            Our streamlined registration process makes it easy to become a shareholder.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
              onClick={() => setShowOrderForm(true)}
            >
              Start Investing
            </Button>
            <Button size="lg" variant="outline" className="border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold/10">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-500">
              <Link to="/join/express" className="text-yawatu-gold hover:underline font-medium">Quick Join (2 min)</Link>
              <span className="hidden sm:inline">|</span>
              <Link to="/login" className="text-yawatu-gold hover:underline">User Login</Link>
              <span className="hidden sm:inline">|</span>
              <Link to="/admin/login" className="text-yawatu-gold hover:underline">Admin Login</Link>
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

export default RegisterCTA;
