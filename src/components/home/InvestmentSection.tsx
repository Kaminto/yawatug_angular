import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Shield, DollarSign } from "lucide-react";

const InvestmentSection = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Financial Potential",
      description: "Uganda's mining sector is poised for explosive growth, with gold and tantalite reserves that are largely untapped. Yawatu PLC gives you direct exposure to this emerging market."
    },
    {
      icon: Shield,
      title: "Operational Excellence",
      description: "Our mining operations employ modern technology and sustainable practices, ensuring efficient extraction and processing of minerals."
    },
    {
      icon: DollarSign,
      title: "Dividend Structure",
      description: "Shareholders receive quarterly dividends based on mining production and mineral prices, providing a regular income stream."
    }
  ];

  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Invest in Yawatu</h2>
        
        <Tabs defaultValue="why-invest" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="why-invest">Why Invest</TabsTrigger>
            <TabsTrigger value="how-to-buy">How to Buy</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="why-invest" className="mt-8">
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <Icon className="h-12 w-12 text-primary mb-4" />
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Learn More About Investing
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="how-to-buy" className="mt-8">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-6">How to Purchase Shares</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold">Create an Account</h4>
                      <p className="text-muted-foreground">Register with your details and verify your identity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold">Fund Your Account</h4>
                      <p className="text-muted-foreground">Add funds via mobile money or bank transfer</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold">Buy Shares</h4>
                      <p className="text-muted-foreground">Purchase shares starting from just 10 units</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="faqs" className="mt-8">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">What is the minimum investment?</h4>
                    <p className="text-muted-foreground">You can start investing with as little as 10 shares at 10,000 UGX per share.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">How often are dividends paid?</h4>
                    <p className="text-muted-foreground">Dividends are distributed quarterly based on mining production and market performance.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Can I sell my shares?</h4>
                    <p className="text-muted-foreground">Yes, you can trade your shares on our platform 24/7 with instant liquidity.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default InvestmentSection;