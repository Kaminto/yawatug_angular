import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  TrendingUp, 
  Shield, 
  Users, 
  Leaf, 
  Download, 
  ArrowRight,
  CheckCircle,
  DollarSign,
  PieChart,
  Smartphone,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";

const Investors = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const whyInvestReasons = [
    {
      icon: TrendingUp,
      title: "Guaranteed 15% Annual Returns",
      description: "Contractually guaranteed returns backed by gold mining operations and transparent financial reporting."
    },
    {
      icon: Shield,
      title: "Regulated & Registered",
      description: "PLC registered company with full regulatory compliance and third-party audited financial statements."
    },
    {
      icon: Users,
      title: "Women-Led Leadership",
      description: "Pioneer in female leadership driving innovation and ethical practices in the mining industry."
    },
    {
      icon: Leaf,
      title: "Ethical & Sustainable",
      description: "Environmental stewardship and community-focused mining practices ensuring long-term sustainability."
    }
  ];

  const investmentSteps = [
    {
      step: "01",
      title: "Register Account",
      description: "Complete your registration with KYC verification. Mobile app coming soon!",
      icon: Smartphone
    },
    {
      step: "02",
      title: "Choose Shares",
      description: "Start with minimum 10 shares. Flexible installment payment plans available.",
      icon: PieChart
    },
    {
      step: "03",
      title: "Secure Payment",
      description: "Make payment via mobile money, bank transfer, or credit card with secure processing.",
      icon: Shield
    },
    {
      step: "04",
      title: "Start Earning",
      description: "Receive share certificates and start earning quarterly dividends and capital appreciation.",
      icon: TrendingUp
    }
  ];

  const faqs = [
    {
      question: "What is the minimum investment amount?",
      answer: "The minimum investment is UGX 100,000, making it accessible for a wide range of investors while maintaining serious investment commitment."
    },
    {
      question: "How are the 15% guaranteed returns paid?",
      answer: "Returns are paid quarterly through dividends directly to your registered bank account or mobile money. The 15% is calculated annually and distributed evenly across four payments."
    },
    {
      question: "Can I sell my shares anytime?",
      answer: "Yes, shares can be traded on our digital platform. However, we recommend holding for at least 12 months to maximize returns and benefit from our buy-back guarantee program."
    },
    {
      question: "How transparent are the mining operations?",
      answer: "We provide monthly operation reports, quarterly financial statements, and annual sustainability reports. Investors can also visit mining sites during scheduled tours."
    },
    {
      question: "What happens to my investment if I need emergency funds?",
      answer: "We offer a liquidity program where shares can be sold back to the company at current market value with 30-day notice period for emergency situations."
    },
    {
      question: "Are there any fees or hidden charges?",
      answer: "No hidden fees. There's a one-time 2% processing fee at purchase and a 1% annual management fee deducted from dividends. All fees are clearly disclosed upfront."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-32 pb-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-6">Investor Information</Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-secondary-foreground">
                Invest in Uganda's
                <span className="block gold-text">Mining Future</span>
              </h1>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                Join hundreds of investors earning guaranteed returns through ethical gold mining. 
                Transparent operations, women-led leadership, and digital accessibility.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="gold-button text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/register-new">
                    Start Investing Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg px-8 py-4 h-auto" disabled>
                  <Download className="mr-2 h-5 w-5" />
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Why Invest Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Why Choose <span className="gold-text">Yawatu</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Four compelling reasons why Yawatu is the smart choice for your mining investment portfolio
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {whyInvestReasons.map((reason, index) => {
                  const IconComponent = reason.icon;
                  return (
                    <Card key={index} className="soft-shadow border-primary/20 hover:border-primary/40 transition-colors duration-300">
                      <CardHeader className="pb-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                          <IconComponent className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <CardTitle className="text-xl text-foreground">{reason.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">{reason.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-secondary-foreground">
                  How to <span className="gold-text">Invest</span>
                </h2>
                <p className="text-xl text-secondary-foreground/80 max-w-3xl mx-auto">
                  Start your investment journey in just four simple steps
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {investmentSteps.map((step, index) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={index} className="text-center">
                      <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                        <span className="text-primary-foreground font-bold text-lg">{step.step}</span>
                      </div>
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-4 text-secondary-foreground">{step.title}</h3>
                      <p className="text-secondary-foreground/70 leading-relaxed">{step.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Returns Explainer Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Understanding Your <span className="gold-text">Returns</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Two ways your investment grows: regular dividends and share price appreciation
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <Card className="soft-shadow border-primary/20">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                      <DollarSign className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl text-foreground">Quarterly Dividends</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                      Receive 3.75% quarterly dividends (15% annually) paid directly to your account. 
                      These payments come from mining profits and are guaranteed regardless of market conditions.
                    </p>
                    <div className="bg-primary/10 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Example Investment:</h4>
                      <p className="text-sm text-muted-foreground">
                        UGX 1,000,000 investment = UGX 37,500 quarterly dividend = UGX 150,000 annual income
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="soft-shadow border-primary/20">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl text-foreground">Capital Appreciation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                      As mining operations expand and gold reserves increase, share values appreciate. 
                      Historical performance shows 8-12% annual price growth on top of dividends.
                    </p>
                    <div className="bg-primary/10 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Total Potential Return:</h4>
                      <p className="text-sm text-muted-foreground">
                        15% guaranteed dividends + 8-12% price appreciation = 23-27% total annual return
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* App Download CTA */}
        <section className="py-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-secondary-foreground">
                Start Investing with the
                <span className="block gold-text">Yawatu App</span>
              </h2>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                Download our mobile app for seamless portfolio management, real-time updates, 
                and instant access to your investment dashboard.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" className="gold-button text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/app-download">
                    <Download className="mr-2 h-5 w-5" />
                    Download for iOS
                  </Link>
                </Button>
                <Button size="lg" className="gold-button text-lg px-8 py-4 h-auto" asChild>
                  <Link to="/app-download">
                    <Download className="mr-2 h-5 w-5" />
                    Download for Android
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 soft-shadow">
                  <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-sm text-secondary-foreground">Real-time Reports</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 soft-shadow">
                  <PieChart className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-sm text-secondary-foreground">Portfolio Tracking</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 soft-shadow">
                  <DollarSign className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-sm text-secondary-foreground">Instant Payments</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Frequently Asked <span className="gold-text">Questions</span>
                </h2>
                <p className="text-xl text-muted-foreground">
                  Get answers to common questions about investing with Yawatu
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <Card key={index} className="soft-shadow border-primary/20">
                    <CardHeader className="cursor-pointer" onClick={() => toggleFAQ(index)}>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-foreground text-left">{faq.question}</CardTitle>
                        {openFAQ === index ? (
                          <ChevronUp className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardHeader>
                    {openFAQ === index && (
                      <CardContent className="pt-0">
                        <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <div className="text-center mt-12">
                <p className="text-muted-foreground mb-6">Still have questions?</p>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                  <Link to="/contact">Contact Our Investment Team</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Investors;