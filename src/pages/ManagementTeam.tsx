import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Linkedin, Mail } from "lucide-react";
import managementImage from "@/assets/images/icons/management.jpg";

const ManagementTeam = () => {
  const executives = [
    {
      name: "Dr. Samuel Kiprotich",
      position: "Chief Executive Officer",
      experience: "15+ years in mining operations",
      background: "PhD in Mining Engineering, former operations director at major mining corporations",
      image: managementImage
    },
    {
      name: "Sarah Nakimuli",
      position: "Chief Financial Officer", 
      experience: "12+ years in financial management",
      background: "CPA, MBA Finance, extensive experience in mining sector financial operations",
      image: managementImage
    },
    {
      name: "James Okello",
      position: "Chief Operating Officer",
      experience: "18+ years in mining operations",
      background: "Mining Engineering degree, specialist in gold extraction and processing",
      image: managementImage
    },
    {
      name: "Dr. Grace Nabukenya",
      position: "Head of Sustainability",
      experience: "10+ years in environmental compliance",
      background: "PhD Environmental Science, expert in sustainable mining practices",
      image: managementImage
    }
  ];

  const advisors = [
    {
      name: "Prof. Robert Musinguzi",
      position: "Chairman of the Board",
      background: "Former Director of Geological Survey of Uganda"
    },
    {
      name: "Mary Kiggundu",
      position: "Independent Director",
      background: "Senior Partner at leading legal firm"
    },
    {
      name: "Dr. Peter Kyamanywa",
      position: "Technical Advisor",
      background: "30+ years in mining geology"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Our Leadership Team
            </h1>
            <p className="text-xl text-muted-foreground">
              Experienced professionals leading Yawatu Mining PLC with decades of combined expertise in mining, finance, and operations.
            </p>
          </div>
        </div>
      </section>

      {/* Executive Team */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Executive Team</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {executives.map((executive, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3">
                    <img
                      src={executive.image}
                      alt={executive.name}
                      className="w-full h-48 md:h-full object-cover"
                    />
                  </div>
                  <div className="md:w-2/3 p-6">
                    <CardHeader className="p-0 mb-4">
                      <CardTitle className="text-xl">{executive.name}</CardTitle>
                      <p className="text-primary font-semibold">{executive.position}</p>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Experience:</strong> {executive.experience}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {executive.background}
                      </p>
                      <div className="flex gap-2">
                        <button className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                          <Linkedin className="h-4 w-4 text-primary" />
                        </button>
                        <button className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                          <Mail className="h-4 w-4 text-primary" />
                        </button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Board of Directors */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Board of Directors</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {advisors.map((advisor, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <CardTitle className="text-xl">{advisor.name}</CardTitle>
                  <p className="text-primary font-semibold">{advisor.position}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{advisor.background}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Philosophy */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Leadership Philosophy</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Transparency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We believe in open communication with our investors and stakeholders, providing regular updates on our operations and financial performance.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Innovation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our leadership team continuously seeks innovative solutions to improve efficiency, safety, and environmental sustainability in our operations.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Integrity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We maintain the highest ethical standards in all our business dealings and are committed to responsible corporate governance.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ManagementTeam;