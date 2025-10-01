import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, TrendingUp, Calendar } from "lucide-react";
import financialImage from "@/assets/images/icons/financial.jpg";

const FinancialReports = () => {
  const reports = [
    {
      title: "Annual Report 2023",
      type: "Annual Report",
      date: "March 2024",
      description: "Comprehensive annual financial report including audited statements, management discussion, and outlook for 2024.",
      size: "2.3 MB",
      status: "Latest"
    },
    {
      title: "Q4 2023 Financial Results", 
      type: "Quarterly Report",
      date: "January 2024",
      description: "Fourth quarter financial results with detailed analysis of revenue, expenses, and dividend distributions.",
      size: "1.8 MB",
      status: "Recent"
    },
    {
      title: "Q3 2023 Investor Update",
      type: "Quarterly Report", 
      date: "October 2023",
      description: "Third quarter performance review including mining operations update and market analysis.",
      size: "1.5 MB",
      status: "Archived"
    },
    {
      title: "2023 Sustainability Report",
      type: "Sustainability Report",
      date: "December 2023", 
      description: "Environmental and social impact report detailing our commitment to sustainable mining practices.",
      size: "3.1 MB",
      status: "Recent"
    },
    {
      title: "Mining Operations Report H1 2023",
      type: "Operations Report",
      date: "July 2023",
      description: "Detailed report on mining activities, production volumes, and operational efficiency metrics.",
      size: "2.7 MB", 
      status: "Archived"
    }
  ];

  const financialHighlights = [
    {
      metric: "Revenue",
      value: "USD 12.5M",
      change: "+18%",
      period: "2023"
    },
    {
      metric: "Net Profit",
      value: "USD 3.2M", 
      change: "+25%",
      period: "2023"
    },
    {
      metric: "Dividend Yield",
      value: "15.2%",
      change: "+2.1%",
      period: "2023"
    },
    {
      metric: "ROI",
      value: "22.8%",
      change: "+5.3%",
      period: "2023"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Latest": return "bg-green-500";
      case "Recent": return "bg-blue-500";
      case "Archived": return "bg-gray-500";
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
                Financial Reports
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Access our comprehensive financial reports, quarterly updates, and transparency documents to stay informed about Yawatu's performance.
              </p>
            </div>
            <div className="relative">
              <img
                src={financialImage}
                alt="Financial Reports"
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Financial Highlights */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">2023 Financial Highlights</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {financialHighlights.map((highlight, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">
                  {highlight.value}
                </div>
                <div className="text-lg font-semibold mb-1">{highlight.metric}</div>
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">{highlight.change}</span>
                  <span className="text-gray-400">vs {highlight.period}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reports List */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Available Reports</h2>
          <div className="space-y-6">
            {reports.map((report, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-2/3 p-6">
                    <CardHeader className="p-0 mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-2">{report.title}</CardTitle>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline">{report.type}</Badge>
                            <Badge className={`${getStatusColor(report.status)} text-white`}>
                              {report.status}
                            </Badge>
                          </div>
                        </div>
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-muted-foreground mb-4">{report.description}</p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{report.date}</span>
                        </div>
                        <div>
                          <span>Size: {report.size}</span>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                  <div className="md:w-1/3 p-6 flex items-center justify-center bg-muted/30">
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency Commitment */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Commitment to Transparency</h2>
            <p className="text-xl text-muted-foreground">
              We believe in providing our investors with complete transparency about our financial performance and business operations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Regular Reporting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Quarterly financial reports and annual comprehensive statements audited by independent accounting firms.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Operational Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Regular updates on mining operations, production metrics, and project development progress.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Investor Communications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Direct communication channels for investor questions and annual general meetings for shareholder engagement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-xl mb-8 opacity-90">
            Subscribe to receive our financial reports and updates directly in your inbox.
          </p>
          <Button size="lg" variant="secondary">
            Subscribe to Updates
          </Button>
        </div>
      </section>
    </div>
  );
};

export default FinancialReports;