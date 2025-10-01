import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Eye, Award, Users } from "lucide-react";
import aboutImage from "@/assets/images/icons/about.jpg";
import miningOps from "@/assets/images/mining/mining-operations.jpg";

const AboutCompany = () => {
  const values = [
    {
      icon: Target,
      title: "Mission",
      description: "To be Uganda's leading gold mining company, providing sustainable returns to investors while contributing to economic development."
    },
    {
      icon: Eye,
      title: "Vision",
      description: "To create lasting value through responsible mining practices and innovative investment opportunities."
    },
    {
      icon: Award,
      title: "Excellence",
      description: "Committed to operational excellence and the highest standards of safety and environmental stewardship."
    },
    {
      icon: Users,
      title: "Community",
      description: "Building strong relationships with local communities and contributing to Uganda's economic growth."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                About Yawatu Mining PLC
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Uganda's premier gold mining company, committed to sustainable operations and investor returns since our establishment.
              </p>
            </div>
            <div className="relative">
              <img
                src={aboutImage}
                alt="About Yawatu"
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Yawatu Mining PLC was founded with a vision to unlock Uganda's vast gold mining potential while providing sustainable investment opportunities for local and international investors.
              </p>
              <p className="text-muted-foreground mb-4">
                Since our inception, we have grown from a small mining operation to one of Uganda's most trusted mining companies, consistently delivering value to our shareholders through responsible mining practices and strategic investments.
              </p>
              <p className="text-muted-foreground">
                Today, we operate multiple mining sites across Uganda, employing hundreds of people and contributing significantly to the local economy while maintaining our commitment to environmental sustainability.
              </p>
            </div>
            <div>
              <img
                src={miningOps}
                alt="Mining Operations"
                className="rounded-lg shadow-lg w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision & Values */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Statistics */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Company Highlights</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">5+</div>
              <p className="text-gray-400">Years of Operation</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">3,275</div>
              <p className="text-gray-400">Active Investors</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">500+</div>
              <p className="text-gray-400">Employees</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">15%</div>
              <p className="text-gray-400">Average Annual Return</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Commitment to Sustainability</h2>
            <p className="text-xl text-muted-foreground mb-8">
              We are committed to responsible mining practices that protect the environment and benefit local communities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Environmental Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Implementing strict environmental controls and rehabilitation programs to minimize our ecological footprint.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Community Development</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Investing in local communities through education, healthcare, and infrastructure development programs.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Economic Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Creating employment opportunities and contributing to Uganda's economic growth through taxes and local procurement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutCompany;