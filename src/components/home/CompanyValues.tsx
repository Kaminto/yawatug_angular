import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import integrityImage from "@/assets/images/values/integrity.jpg";
import innovationImage from "@/assets/images/values/innovation.jpg";
import sustainabilityImage from "@/assets/images/values/sustainability.jpg";

const CompanyValues = () => {
  const values = [
    {
      title: "Integrity",
      description: "We uphold the highest standards of integrity in all our actions, ensuring honesty and fairness in our dealings. We believe that transparency is essential for accountability, empowering our investors with clear insights into our operations and decisions.",
      image: integrityImage
    },
    {
      title: "Innovation",
      description: "We are committed to continuous improvement and innovation, adapting to changes in the market to better serve our stakeholders. We harness the latest technologies and practices to enhance our operations and deliver value.",
      image: innovationImage
    },
    {
      title: "Sustainability",
      description: "Our operations are designed to ensure that we minimize environmental impact while maximizing resource efficiency. We actively engage with communities to promote responsible mining practices and contribute to local development.",
      image: sustainabilityImage
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Values That Define Us</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Guided by principles that shape our business decision-making.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <Card key={index} className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="aspect-video overflow-hidden">
                <img 
                  src={value.image} 
                  alt={value.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-primary">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CompanyValues;