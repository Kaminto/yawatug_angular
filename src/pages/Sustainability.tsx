import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Leaf, 
  Users, 
  Heart, 
  ArrowRight,
  TreePine,
  Droplets,
  GraduationCap,
  Home,
  Briefcase,
  Award,
  Target,
  Globe,
  CheckCircle,
  Quote,
  Shield
} from "lucide-react";

const Sustainability = () => {
  const [animatedStats, setAnimatedStats] = useState({
    jobs: 0,
    trees: 0,
    women: 0,
    communities: 0
  });

  const finalStats = {
    jobs: 250,
    trees: 5000,
    women: 85,
    communities: 12
  };

  // Animate counters on mount
  useEffect(() => {
    const duration = 2000;
    const intervals: NodeJS.Timeout[] = [];

    Object.entries(finalStats).forEach(([key, finalValue]) => {
      let currentValue = 0;
      const increment = finalValue / (duration / 50);
      
      const interval = setInterval(() => {
        currentValue += increment;
        if (currentValue >= finalValue) {
          currentValue = finalValue;
          clearInterval(interval);
        }
        setAnimatedStats(prev => ({
          ...prev,
          [key]: Math.floor(currentValue)
        }));
      }, 50);
      
      intervals.push(interval);
    });

    return () => {
      intervals.forEach(clearInterval);
    };
  }, []);

  const environmentalInitiatives = [
    {
      title: "Land Rehabilitation",
      description: "Restoring mining sites to their natural state with native vegetation and sustainable land use practices",
      icon: TreePine,
      stats: "95% of sites restored",
      color: "text-green-500"
    },
    {
      title: "Water Conservation",
      description: "Advanced water recycling systems and groundwater protection measures",
      icon: Droplets,
      stats: "80% water recycled",
      color: "text-blue-500"
    },
    {
      title: "Reforestation Projects",
      description: "Planting indigenous trees to offset carbon footprint and restore biodiversity",
      icon: Leaf,
      stats: "5,000+ trees planted",
      color: "text-green-600"
    }
  ];

  const socialImpactPrograms = [
    {
      title: "Women in Mining Initiative",
      description: "Training and empowering local women in mining skills, leadership, and entrepreneurship",
      icon: Users,
      beneficiaries: "85 women trained",
      impact: "60% leadership roles filled by women"
    },
    {
      title: "Local Employment Program",
      description: "Prioritizing local hiring and providing skills development opportunities",
      icon: Briefcase,
      beneficiaries: "250 local jobs created",
      impact: "90% workforce from local communities"
    },
    {
      title: "Education Support",
      description: "Building schools, providing scholarships, and supporting educational infrastructure",
      icon: GraduationCap,
      beneficiaries: "500+ students supported",
      impact: "3 schools built/renovated"
    },
    {
      title: "Community Infrastructure",
      description: "Clean water projects, healthcare facilities, and road improvements",
      icon: Home,
      beneficiaries: "12 communities served",
      impact: "8 water wells constructed"
    }
  ];

  const communityTestimonials = [
    {
      name: "Margaret Nabukalu",
      role: "Local Business Owner & Mining Trainee",
      location: "Mubende District",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
      quote: "Yawatu's women training program changed my life. I learned valuable mining skills and started my own business. Now I employ five other women from our community."
    },
    {
      name: "Joseph Kiprotich",
      role: "Mine Supervisor",
      location: "Moroto District", 
      image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
      quote: "Working with Yawatu means more than just a job. They invested in our community with a new water well and school. My children now have better opportunities."
    },
    {
      name: "Sarah Nakato",
      role: "Environmental Officer",
      location: "Buhweju District",
      image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7",
      quote: "I'm proud to work for a company that truly cares about the environment. We've planted over 1,000 trees in our area and the wildlife is returning."
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
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-6">Sustainability & Impact</Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-secondary-foreground">
                Mining for a
                <span className="block gold-text">Sustainable Future</span>
              </h1>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                At Yawatu, we believe that responsible mining creates lasting value for our investors, 
                communities, and the environment. Our commitment goes beyond extraction to regeneration and empowerment.
              </p>
              
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-500/20">
                  <Leaf className="h-4 w-4 text-green-400" />
                  <span className="text-foreground text-sm">Carbon Negative</span>
                </div>
                <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-500/20">
                  <Users className="h-4 w-4 text-green-400" />
                  <span className="text-foreground text-sm">Community First</span>
                </div>
                <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-500/20">
                  <Award className="h-4 w-4 text-green-400" />
                  <span className="text-foreground text-sm">ESG Certified</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Responsibility */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                    Our <span className="text-green-500">Responsibility</span>
                  </h2>
                  <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                    <p>
                      We believe that mining should be a force for positive change. Our approach prioritizes 
                      the wellbeing of local communities and ecosystems, ensuring that our operations create 
                      lasting benefits that extend far beyond our mining sites.
                    </p>
                    <p>
                      Every decision we make is guided by our commitment to environmental stewardship, 
                      social responsibility, and economic empowerment. We don't just extract resources – 
                      we invest in the future of Uganda's people and landscapes.
                    </p>
                    <p>
                      Through innovative practices, community partnerships, and transparent operations, 
                      we're proving that profitable mining and sustainable development can go hand in hand.
                    </p>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">Zero Harm Goal</div>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Globe className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">UN SDG Aligned</div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1615729947596-a598e5de0ab3" 
                    alt="Sustainable mining landscape" 
                    className="w-full h-[500px] object-cover rounded-2xl soft-shadow"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Statistics */}
        <section className="py-20 bg-gradient-to-br from-green-900/20 to-background relative overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                  Our <span className="text-green-400">Impact by Numbers</span>
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Measurable results from our commitment to sustainable and responsible mining
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card className="bg-white/5 border-green-500/20 backdrop-blur-sm text-center">
                  <CardContent className="p-8">
                    <Briefcase className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <div className="text-4xl font-bold text-white mb-2">{animatedStats.jobs}+</div>
                    <div className="text-green-300 text-sm font-medium mb-1">Local Jobs Created</div>
                    <div className="text-gray-400 text-xs">90% from local communities</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-green-500/20 backdrop-blur-sm text-center">
                  <CardContent className="p-8">
                    <TreePine className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <div className="text-4xl font-bold text-white mb-2">{animatedStats.trees.toLocaleString()}+</div>
                    <div className="text-green-300 text-sm font-medium mb-1">Trees Planted</div>
                    <div className="text-gray-400 text-xs">Native species reforestation</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-green-500/20 backdrop-blur-sm text-center">
                  <CardContent className="p-8">
                    <Users className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <div className="text-4xl font-bold text-white mb-2">{animatedStats.women}+</div>
                    <div className="text-green-300 text-sm font-medium mb-1">Women Trained</div>
                    <div className="text-gray-400 text-xs">In mining & leadership skills</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-green-500/20 backdrop-blur-sm text-center">
                  <CardContent className="p-8">
                    <Home className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <div className="text-4xl font-bold text-white mb-2">{animatedStats.communities}+</div>
                    <div className="text-green-300 text-sm font-medium mb-1">Communities Served</div>
                    <div className="text-gray-400 text-xs">Direct infrastructure support</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Environmental Care */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Environmental <span className="text-green-500">Care</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Our comprehensive approach to environmental protection and ecosystem restoration
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {environmentalInitiatives.map((initiative, index) => {
                  const IconComponent = initiative.icon;
                  return (
                    <Card key={index} className="soft-shadow border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover-scale">
                      <CardHeader className="text-center pb-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                          <IconComponent className={`h-8 w-8 ${initiative.color}`} />
                        </div>
                        <CardTitle className="text-xl text-foreground">{initiative.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed mb-4">{initiative.description}</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">{initiative.stats}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Social Impact */}
        <section className="py-20 bg-gradient-to-br from-green-900/10 to-background relative overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Social <span className="text-green-400">Impact</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Empowering communities through education, employment, and infrastructure development
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {socialImpactPrograms.map((program, index) => {
                  const IconComponent = program.icon;
                  return (
                    <Card key={index} className="bg-white/5 border-green-500/20 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-green-500/30">
                            <IconComponent className="h-6 w-6 text-green-400" />
                          </div>
                          <div>
                            <CardTitle className="text-xl text-foreground mb-2">{program.title}</CardTitle>
                            <p className="text-muted-foreground">{program.description}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                            <div className="text-sm text-green-400 font-medium">Beneficiaries</div>
                            <div className="text-foreground font-semibold">{program.beneficiaries}</div>
                          </div>
                          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                            <div className="text-sm text-green-400 font-medium">Impact</div>
                            <div className="text-foreground font-semibold">{program.impact}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Community Engagement */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Community <span className="text-green-500">Voices</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Stories from the people whose lives have been transformed by our sustainable mining approach
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {communityTestimonials.map((testimonial, index) => (
                  <Card key={index} className="soft-shadow border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                    <CardHeader className="text-center pb-4">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden soft-shadow">
                        <img 
                          src={testimonial.image} 
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-foreground">{testimonial.name}</CardTitle>
                        <p className="text-green-600 font-medium text-sm">{testimonial.role}</p>
                        <p className="text-muted-foreground text-xs">{testimonial.location}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <Quote className="h-8 w-8 text-green-500/30 absolute -top-2 -left-2" />
                        <p className="text-muted-foreground leading-relaxed italic pl-4">{testimonial.quote}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ESG Report CTA */}
        <section className="py-20 bg-gradient-to-br from-green-900/20 to-background relative overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Transparency in
                <span className="block text-green-400">Every Action</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Our comprehensive ESG report details our environmental, social, and governance commitments. 
                See the full scope of our sustainability initiatives and measurable impact.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/esg-report">
                    See Our Full ESG Report
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-green-400 text-green-400 hover:bg-green-500/10 text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/investors">
                    Invest Sustainably
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 soft-shadow border border-green-500/20">
                  <Leaf className="h-8 w-8 text-green-400 mx-auto mb-3" />
                  <div className="text-sm text-gray-300">Environmental Stewardship</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 soft-shadow border border-green-500/20">
                  <Users className="h-8 w-8 text-green-400 mx-auto mb-3" />
                  <div className="text-sm text-gray-300">Social Responsibility</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 soft-shadow border border-green-500/20">
                  <Shield className="h-8 w-8 text-green-400 mx-auto mb-3" />
                  <div className="text-sm text-gray-300">Governance Excellence</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 soft-shadow border border-green-500/20">
                  <Award className="h-8 w-8 text-green-400 mx-auto mb-3" />
                  <div className="text-sm text-gray-300">Global Standards</div>
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

export default Sustainability;