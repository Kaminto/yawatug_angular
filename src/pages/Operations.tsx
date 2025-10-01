import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Search, 
  FileCheck, 
  Pickaxe, 
  MapPin, 
  Shield, 
  Users, 
  Leaf, 
  ArrowRight,
  Factory,
  Compass,
  Award,
  Zap,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import ProjectLocationMap from "@/components/operations/ProjectLocationMap";

interface ProjectLocation {
  name: string;
  district: string;
  status: string;
  type: string;
  coordinates: [number, number];
}

const Operations = () => {
  const valueChainSteps = [
    {
      step: "01",
      title: "Exploration & Surveying",
      description: "Advanced geological surveys and mineral mapping using cutting-edge technology",
      icon: Search,
      details: [
        "Geological and geophysical surveys using modern equipment",
        "Soil sampling and geochemical analysis",
        "Drone-based aerial surveys for accurate mapping",
        "3D modeling and resource estimation"
      ]
    },
    {
      step: "02", 
      title: "Licensing & Compliance",
      description: "Full regulatory compliance with Uganda's Ministry of Energy and Mineral Development",
      icon: FileCheck,
      details: [
        "Mining lease applications and approvals",
        "Environmental impact assessments",
        "Community engagement and consent",
        "Regular compliance audits and reporting"
      ]
    },
    {
      step: "03",
      title: "Mining & Processing",
      description: "Sustainable extraction using modern equipment and environmentally conscious methods",
      icon: Pickaxe,
      details: [
        "Low-impact extraction techniques",
        "On-site processing and refining facilities",
        "Quality control and assurance systems",
        "Waste management and rehabilitation"
      ]
    },
    {
      step: "04",
      title: "Distribution & Sales",
      description: "Refined gold sales through authorized channels with full traceability",
      icon: TrendingUp,
      details: [
        "Certified gold refining and hallmarking",
        "International market sales",
        "Blockchain-based traceability",
        "Revenue sharing with investors"
      ]
    }
  ];

  const projectLocations: ProjectLocation[] = [
    {
      name: "Mubende Gold Project",
      district: "Mubende",
      status: "Active",
      type: "Primary extraction site",
      coordinates: [31.3956, 0.5586]
    },
    {
      name: "Buhweju Exploration Site",
      district: "Buhweju", 
      status: "Exploration",
      type: "Geological survey",
      coordinates: [30.1446, -0.1927]
    },
    {
      name: "Moroto Mining Concession",
      district: "Moroto",
      status: "Development",
      type: "Future mining site",
      coordinates: [34.6656, 2.5372]
    }
  ];

  const responsiblePractices = [
    {
      category: "Environmental Protection",
      icon: Leaf,
      practices: [
        "Zero mercury usage in processing",
        "Water recycling and treatment systems",
        "Reforestation and habitat restoration",
        "Carbon footprint monitoring and reduction"
      ]
    },
    {
      category: "Worker Safety",
      icon: Shield,
      practices: [
        "Comprehensive safety training programs",
        "Modern protective equipment provision",
        "Regular health and safety audits",
        "Emergency response protocols"
      ]
    },
    {
      category: "Ethical Labor",
      icon: Users,
      practices: [
        "Fair wages above industry standards",
        "Local employment prioritization",
        "Skills development and training",
        "Community benefit sharing"
      ]
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
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-6">Mining Operations</Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-secondary-foreground">
                Sustainable Gold Mining
                <span className="block gold-text">Operations in Uganda</span>
              </h1>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                From exploration to extraction, our state-of-the-art operations combine traditional mining 
                expertise with cutting-edge technology and sustainable practices.
              </p>
              
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Factory className="h-4 w-4 text-primary" />
                  <span className="text-secondary-foreground text-sm">3 Active Sites</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-secondary-foreground text-sm">Fully Licensed</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Leaf className="h-4 w-4 text-primary" />
                  <span className="text-secondary-foreground text-sm">Zero Mercury</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Chain Process */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Our Mining <span className="gold-text">Value Chain</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  A comprehensive approach from exploration to market delivery
                </p>
              </div>

              <div className="space-y-12">
                {valueChainSteps.map((step, index) => {
                  const IconComponent = step.icon;
                  const isEven = index % 2 === 0;
                  
                  return (
                    <div key={index} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${!isEven ? 'lg:grid-flow-col-dense' : ''}`}>
                      <div className={`${!isEven ? 'lg:col-start-2' : ''}`}>
                        <div className="flex items-start gap-4 mb-6">
                          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-foreground font-bold text-lg">{step.step}</span>
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">{step.title}</h3>
                            <p className="text-muted-foreground text-lg">{step.description}</p>
                          </div>
                        </div>
                        
                        <ul className="space-y-3">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className={`${!isEven ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                        <Card className="bg-primary/5 border-primary/20 p-8 text-center soft-shadow hover-scale transition-all duration-300">
                          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconComponent className="h-12 w-12 text-primary-foreground" />
                          </div>
                          <div className="text-6xl font-bold text-primary mb-2">{step.step}</div>
                          <div className="text-lg font-semibold text-foreground">{step.title}</div>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Project Locations */}
        <section className="py-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-secondary-foreground">
                  Project <span className="gold-text">Locations</span>
                </h2>
                <p className="text-xl text-secondary-foreground/80 max-w-3xl mx-auto">
                  Strategic mining sites across Uganda's mineral-rich regions
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-6">
                  {projectLocations.map((location, index) => (
                    <Card key={index} className="bg-white/5 border-primary/20 backdrop-blur-sm soft-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl text-secondary-foreground mb-2">{location.name}</CardTitle>
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="text-secondary-foreground/80">{location.district} District</span>
                            </div>
                          </div>
                          <Badge 
                            className={`${
                              location.status === 'Active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              location.status === 'Development' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}
                          >
                            {location.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-secondary-foreground/70">{location.type}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="lg:sticky lg:top-8">
                  <Card className="bg-white/5 border-primary/20 backdrop-blur-sm soft-shadow p-4">
                    <ProjectLocationMap locations={projectLocations} />
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Responsible Mining Practices */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Responsible <span className="gold-text">Mining Practices</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Our commitment to environmental protection, worker safety, and ethical labor standards
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {responsiblePractices.map((category, index) => {
                  const IconComponent = category.icon;
                  return (
                    <Card key={index} className="soft-shadow border-primary/20 hover:border-primary/40 transition-all duration-300">
                      <CardHeader className="text-center pb-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                          <IconComponent className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <CardTitle className="text-xl text-foreground">{category.category}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {category.practices.map((practice, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-muted-foreground text-sm">{practice}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Investment CTA */}
        <section className="py-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-secondary-foreground">
                Invest in Our
                <span className="block gold-text">Mining Operations</span>
              </h2>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                Be part of Uganda's sustainable mining revolution. Our transparent operations 
                and proven track record deliver consistent returns to our investors.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" className="gold-button text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/investors">
                    Explore Investment Opportunities
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/contact">
                    Schedule Site Visit
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 soft-shadow">
                  <Compass className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-sm text-secondary-foreground">Advanced Exploration</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 soft-shadow">
                  <Award className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-sm text-secondary-foreground">Full Compliance</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 soft-shadow">
                  <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-sm text-secondary-foreground">Modern Technology</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 soft-shadow">
                  <Leaf className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-sm text-secondary-foreground">Sustainable Practices</div>
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

export default Operations;