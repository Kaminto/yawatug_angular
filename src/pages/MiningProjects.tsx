import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, TrendingUp, Users } from "lucide-react";
import projectsImage from "@/assets/images/icons/projects.jpg";
import miningOps from "@/assets/images/mining/mining-operations.jpg";
import goldMining from "@/assets/images/mining/gold-mining.jpg";
import miningSite from "@/assets/images/mining/mining-site.jpg";

const MiningProjects = () => {
  const projects = [
    {
      name: "Mubende Gold Project",
      location: "Mubende District, Central Uganda",
      status: "Active",
      startDate: "2021",
      investment: "USD 2.5M",
      expectedReturn: "18% annually",
      progress: 85,
      description: "Large-scale gold mining operation with proven reserves of over 100,000 ounces.",
      image: miningOps
    },
    {
      name: "Karamoja Gold Fields",
      location: "Karamoja Region, Northern Uganda",
      status: "Development",
      startDate: "2024",
      investment: "USD 1.8M", 
      expectedReturn: "22% annually",
      progress: 45,
      description: "New exploration project with high-grade gold deposits identified through geological surveys.",
      image: goldMining
    },
    {
      name: "Busoga Mining Complex",
      location: "Busoga Region, Eastern Uganda",
      status: "Planning",
      startDate: "2025",
      investment: "USD 3.2M",
      expectedReturn: "25% annually",
      progress: 15,
      description: "Advanced mining complex targeting multiple gold veins with modern extraction technology.",
      image: miningSite
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500";
      case "Development": return "bg-yellow-500";
      case "Planning": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Our Mining Projects
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Discover our portfolio of gold mining projects across Uganda, each carefully selected for their potential to deliver strong returns to our investors.
              </p>
            </div>
            <div className="relative">
              <img
                src={projectsImage}
                alt="Mining Projects"
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Projects Portfolio */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Active & Upcoming Projects</h2>
          <div className="space-y-8">
            {projects.map((project, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="grid md:grid-cols-3 gap-0">
                  <div className="relative h-64 md:h-auto">
                    <img
                      src={project.image}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className={`${getStatusColor(project.status)} text-white`}>
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="md:col-span-2 p-6">
                    <CardHeader className="p-0 mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl mb-2">{project.name}</CardTitle>
                          <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>{project.location}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{project.expectedReturn}</div>
                          <div className="text-sm text-muted-foreground">Expected Return</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-muted-foreground mb-4">{project.description}</p>
                      
                      <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm text-muted-foreground">Start Date</div>
                            <div className="font-semibold">{project.startDate}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm text-muted-foreground">Investment</div>
                            <div className="font-semibold">{project.investment}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm text-muted-foreground">Progress</div>
                            <div className="font-semibold">{project.progress}%</div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Project Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      <Button className="bg-primary hover:bg-primary/90">
                        View Project Details
                      </Button>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Opportunities */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">Investment Opportunities</h2>
            <p className="text-xl text-muted-foreground">
              Each project offers unique investment opportunities with different risk profiles and return potentials.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Established Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Invest in proven mining operations with consistent production and established revenue streams.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Lower risk profile</li>
                  <li>• Steady dividend payments</li>
                  <li>• Proven reserves</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Development Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Participate in the development of new mining sites with higher growth potential.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Moderate risk profile</li>
                  <li>• Higher return potential</li>
                  <li>• Early investor benefits</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Exploration Ventures</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Join early-stage exploration projects with the highest potential returns.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Higher risk profile</li>
                  <li>• Maximum return potential</li>
                  <li>• Pioneer investor status</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Project Statistics */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Project Portfolio Statistics</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">3</div>
              <p className="text-gray-400">Active Projects</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">USD 7.5M</div>
              <p className="text-gray-400">Total Investment</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">150,000</div>
              <p className="text-gray-400">Ounces of Gold Reserves</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">20%</div>
              <p className="text-gray-400">Average Annual Return</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MiningProjects;