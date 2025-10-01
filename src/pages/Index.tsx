
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import ValuePillars from "@/components/home/ValuePillars";
import TestimonialSection from "@/components/home/TestimonialSection";
import MissionSpotlight from "@/components/home/MissionSpotlight";
import TrustSection from "@/components/home/TrustSection";
import WomenLeadershipSection from "@/components/home/WomenLeadershipSection";
import InvestmentCTA from "@/components/home/InvestmentCTA";
import AppDownloadSection from "@/components/home/AppDownloadSection";
import HomeMediaShowcase from "@/components/home/HomeMediaShowcase";
import SocialShareWidget from "@/components/layout/SocialShareWidget";
import FirstTimeVisitorWelcome from "@/components/welcome/FirstTimeVisitorWelcome";
import PromotionalInsights from "@/components/home/PromotionalInsights";
import StickyMobileCTA from "@/components/home/StickyMobileCTA";

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      <FirstTimeVisitorWelcome />
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <HowItWorksSection />
        <ValuePillars />
        <TrustSection />
        <PromotionalInsights />
        <HomeMediaShowcase />
        <TestimonialSection />
        <MissionSpotlight />
        <WomenLeadershipSection />
        <InvestmentCTA />
        <AppDownloadSection />
      </main>
      <StickyMobileCTA />
      <SocialShareWidget />
      <Footer />
    </div>
  );
};

export default Index;
