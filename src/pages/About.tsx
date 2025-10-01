
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Leaf, 
  Eye, 
  Users, 
  TrendingUp, 
  ArrowRight,
  MapPin,
  Calendar,
  Award
} from "lucide-react";

const About = () => {
  const coreValues = [
    {
      icon: Shield,
      title: "Integrity",
      description: "Upholding the highest ethical standards in all our operations and business practices."
    },
    {
      icon: Leaf,
      title: "Sustainability",
      description: "Protecting our environment while creating sustainable value for future generations."
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "Maintaining open, honest communication with all stakeholders and investors."
    },
    {
      icon: Users,
      title: "Empowerment",
      description: "Fostering inclusive leadership and empowering communities through opportunity."
    },
    {
      icon: TrendingUp,
      title: "Growth",
      description: "Driving sustainable growth that benefits investors, employees, and local communities."
    }
  ];

  const leadership = [
    {
      name: "Dr. Sarah Nakamya",
      title: "Chief Executive Officer & Founder",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
      bio: "A visionary leader with 15+ years in mining engineering and sustainable development. Dr. Nakamya holds a PhD in Mining Engineering from Makerere University and has led numerous successful mining ventures across East Africa."
    },
    {
      name: "Grace Kisakye",
      title: "Chief Operations Officer",
      image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
      bio: "Former mining executive with extensive experience in operations management and safety protocols. Grace has overseen mining operations worth over $50M and is passionate about sustainable mining practices."
    },
    {
      name: "Maria Tumusiime",
      title: "Chief Financial Officer",
      image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7",
      bio: "Chartered accountant and financial strategist with expertise in mining finance and investment management. Maria has successfully raised over $30M in mining investments and ensures transparent financial practices."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-32 pb-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-6">About Yawatu</Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-secondary-foreground">
                Pioneering the Future of
                <span className="block gold-text">Ethical Mining</span>
              </h1>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                Born from a vision to transform Uganda's mining industry through women-led leadership, 
                sustainable practices, and inclusive investment opportunities.
              </p>
              
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-secondary-foreground text-sm">Founded 2022</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-secondary-foreground text-sm">Kampala, Uganda</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-secondary-foreground text-sm">PLC Registered</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Company Story */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                    Our <span className="gold-text">Story</span>
                  </h2>
                  <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                    <p>
                      In 2022, a group of visionary women leaders came together with a bold mission: 
                      to revolutionize Uganda's mining industry through ethical practices, sustainable development, 
                      and inclusive investment opportunities.
                    </p>
                    <p>
                      Founded on the principles of transparency and empowerment, Yawatu Minerals & Mining Ltd 
                      emerged as Uganda's first women-led public mining company, challenging traditional norms 
                      and setting new standards for responsible mining.
                    </p>
                    <p>
                      Today, we stand as a beacon of innovation in the mining sector, proving that profitable 
                      operations and sustainable practices can coexist while empowering local communities and 
                      delivering guaranteed returns to our investors.
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1615729947596-a598e5de0ab3" 
                    alt="Mining operations landscape" 
                    className="w-full h-[400px] object-cover rounded-2xl soft-shadow"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-secondary-foreground">
                  Mission & <span className="gold-text">Vision</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-white/5 border-primary/20 backdrop-blur-sm soft-shadow">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl text-secondary-foreground">Our Mission</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-lg text-secondary-foreground/80 leading-relaxed">
                      To revolutionize the mining industry through women-led leadership, ethical practices, 
                      and innovative technology while creating sustainable wealth for our investors and communities.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-primary/20 backdrop-blur-sm soft-shadow">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl text-secondary-foreground">Our Vision</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-lg text-secondary-foreground/80 leading-relaxed">
                      To be Africa's leading women-led mining company, setting the global standard for ethical 
                      mining practices while democratizing investment access through innovative digital platforms.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Leadership Team */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Our <span className="gold-text">Leadership</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Meet the visionary women leaders driving innovation and excellence in Uganda's mining sector
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {leadership.map((leader, index) => (
                  <Card key={index} className="soft-shadow border-primary/20 hover:border-primary/40 transition-all duration-300 hover-scale">
                    <CardHeader className="text-center pb-4">
                      <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden soft-shadow">
                        <img 
                          src={leader.image} 
                          alt={leader.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardTitle className="text-xl text-foreground">{leader.name}</CardTitle>
                      <p className="text-primary font-medium">{leader.title}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed text-sm">{leader.bio}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-secondary-foreground">
                  Our Core <span className="gold-text">Values</span>
                </h2>
                <p className="text-xl text-secondary-foreground/80 max-w-3xl mx-auto">
                  Five fundamental principles that guide every decision and shape our commitment to excellence
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                {coreValues.map((value, index) => {
                  const IconComponent = value.icon;
                  return (
                    <div key={index} className="text-center group">
                      <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-all duration-300 hover-scale">
                        <IconComponent className="h-10 w-10 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-4 text-secondary-foreground">{value.title}</h3>
                      <p className="text-secondary-foreground/70 leading-relaxed text-sm">{value.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Join Our Mission CTA */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Join Our <span className="gold-text">Mission</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                Be part of the transformation. Invest in Uganda's mining future while supporting 
                ethical practices, women-led leadership, and sustainable development.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" className="gold-button text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/investors">
                    Start Investing Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/contact">
                    Learn More About Us
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div className="bg-primary/10 rounded-lg p-6 soft-shadow">
                  <div className="text-3xl font-bold text-primary mb-2">500+</div>
                  <div className="text-muted-foreground text-sm">Active Investors</div>
                </div>
                <div className="bg-primary/10 rounded-lg p-6 soft-shadow">
                  <div className="text-3xl font-bold text-primary mb-2">15%</div>
                  <div className="text-muted-foreground text-sm">Guaranteed Returns</div>
                </div>
                <div className="bg-primary/10 rounded-lg p-6 soft-shadow">
                  <div className="text-3xl font-bold text-primary mb-2">100%</div>
                  <div className="text-muted-foreground text-sm">Ethical Mining</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
