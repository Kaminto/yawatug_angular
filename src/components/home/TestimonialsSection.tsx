import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import johnMukasa from "@/assets/images/testimonials/john-mukasa.jpg";
import sarahNabukenya from "@/assets/images/testimonials/sarah-nabukenya.jpg";
import danielOkello from "@/assets/images/testimonials/daniel-okello.jpg";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "John Mukasa",
      role: "Investor since 2023",
      image: johnMukasa,
      quote: "Investing in Yawatu shares has been one of my best financial decisions. The returns are impressive and the platform is easy to use."
    },
    {
      name: "Sarah Nabukenya",
      role: "Gold Tier Investor",
      image: sarahNabukenya,
      quote: "The referral program helped me earn additional shares while supporting a Ugandan mining company. Win-win!"
    },
    {
      name: "Daniel Okello",
      role: "Business Owner",
      image: danielOkello,
      quote: "Bulk share purchases come with great bonuses. The dividends have helped fund expansion of my other businesses."
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What Our Investors Say</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border border-primary/20">
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;