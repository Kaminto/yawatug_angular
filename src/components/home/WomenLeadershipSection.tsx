import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Target, Heart } from "lucide-react";

const WomenLeadershipSection = () => {
  return (
    <section className="py-20 gold-gradient">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-primary font-semibold tracking-wide">WOMEN-LED LEADERSHIP</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Pioneering <span className="gold-text">Ethical Mining</span> Through Female Leadership
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Yawatu is proudly led by visionary women who bring transparency, 
              sustainability, and community-first values to Uganda's mining sector. 
              Our female executives are reshaping the industry with innovative approaches 
              that prioritize both profitability and social responsibility.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <Target className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Strategic Vision</h4>
                  <p className="text-sm text-muted-foreground">Data-driven decisions that maximize investor returns</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Community Impact</h4>
                  <p className="text-sm text-muted-foreground">Supporting local communities through ethical practices</p>
                </div>
              </div>
            </div>

            <Button className="gold-button" asChild>
              <Link to="/about">Meet Our Leadership Team</Link>
            </Button>
          </div>

          <div className="relative">
            <Card className="elegant-card overflow-hidden">
              <CardContent className="p-0">
                <img 
                  src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158" 
                  alt="Professional woman leader in modern office setting" 
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">Leading by Example</h3>
                  <p className="text-white/90">Bringing transparency and innovation to mining investments</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WomenLeadershipSection;