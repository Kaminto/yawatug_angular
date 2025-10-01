import React from "react";
import { Quote } from "lucide-react";

const TestimonialSection = () => {
  return (
    <section className="py-20 charcoal-section relative overflow-hidden">
      <div className="mining-pattern absolute inset-0"></div>
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Quote className="h-16 w-16 text-primary mx-auto mb-8 opacity-80" />
            <blockquote className="text-2xl md:text-3xl font-light text-secondary-foreground mb-8 leading-relaxed">
              "Yawatu has transformed how I think about investing. Their transparent approach and guaranteed returns give me confidence in my financial future. As a woman, I'm proud to support a company that champions female leadership in mining."
            </blockquote>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-lg">SK</span>
            </div>
            <h4 className="text-xl font-semibold text-secondary-foreground mb-2">Sarah Nakato</h4>
            <p className="text-secondary-foreground/70">Investor & Entrepreneur, Kampala</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;