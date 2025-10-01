
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InvestmentSlidesModalProps {
  onClose: () => void;
}

const InvestmentSlidesModal: React.FC<InvestmentSlidesModalProps> = ({ onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Yawatu",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <img src="/lovable-uploads/20f4ac2e-05d8-4232-a9e9-fb42d42e4b18.png" alt="Yawatu Minerals & Mining Logo" className="h-20 w-auto mx-auto mb-4" />
            <h3 className="text-2xl font-bold gold-text mb-4">Yawatu 256 PLC</h3>
          </div>
          <div className="space-y-4">
            <p className="text-lg">
              Uganda's premier digital-first minerals investment platform, empowering individuals to own a stake in gold and coltan mining.
            </p>
            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4">
              <h4 className="font-bold text-yawatu-gold mb-2">Our Mission</h4>
              <p className="text-sm">
                To democratize mining investment in Uganda by making it accessible, transparent, and profitable for all Ugandans through cutting-edge technology.
              </p>
            </div>
            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4">
              <h4 className="font-bold text-yawatu-gold mb-2">Leadership & Opportunity</h4>
              <p className="text-sm">
                Led by experienced mining professionals, we're capitalizing on Uganda's rich mineral deposits with modern extraction techniques and digital investment solutions.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Why Invest?",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="font-bold text-green-400 mb-2">High Gold Recovery Rate</h4>
              <p className="text-sm">Our advanced extraction methods ensure maximum gold recovery from each site.</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-bold text-blue-400 mb-2">Low Risk Investment</h4>
              <p className="text-sm">Diversified mining portfolio reduces individual project risks.</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="font-bold text-yellow-400 mb-2">Gold's Price Growth</h4>
              <p className="text-sm">Gold continues to be a hedge against inflation with consistent long-term growth.</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="font-bold text-purple-400 mb-2">Ugandan Mining Law Support</h4>
              <p className="text-sm">Strong legal framework supports mining investments and investor rights.</p>
            </div>
          </div>
          <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4 text-center">
            <h4 className="font-bold text-yawatu-gold mb-2">🇺🇬 Ugandan Registered Company</h4>
            <p className="text-sm">Your investment is safe and locally accessible under Ugandan law.</p>
          </div>
        </div>
      )
    },
    {
      title: "Our Edge",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4">
              <h4 className="font-bold text-yawatu-gold mb-2">📱 Mobile-First Trading</h4>
              <p className="text-sm">Trade shares anytime, anywhere with our intuitive mobile platform designed for modern investors.</p>
            </div>
            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4">
              <h4 className="font-bold text-yawatu-gold mb-2">🕐 24/7 Liquidity</h4>
              <p className="text-sm">Buy and sell shares around the clock with instant settlement and real-time processing.</p>
            </div>
            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4">
              <h4 className="font-bold text-yawatu-gold mb-2">👥 Peer-to-Peer Transfer</h4>
              <p className="text-sm">Transfer shares directly to other investors instantly with our P2P system.</p>
            </div>
            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4">
              <h4 className="font-bold text-yawatu-gold mb-2">💰 Wallet Integration</h4>
              <p className="text-sm">Seamless multi-currency wallet supporting both UGX and USD transactions.</p>
            </div>
          </div>
          <div className="text-center bg-gradient-to-r from-yawatu-gold/20 to-yawatu-gold-dark/20 border border-yawatu-gold/30 rounded-lg p-4">
            <p className="text-yawatu-gold font-semibold">
              🚀 The future of mining investment is digital, accessible, and transparent
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Rewards & Security",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-bold text-yawatu-gold mb-2">🎁 Ongoing Promotions</h4>
              <ul className="space-y-2 text-sm">
                <li>• Referral bonuses for bringing new investors</li>
                <li>• Top 100 shareholders receive branded gold bars</li>
                <li>• Early investor rewards and exclusive benefits</li>
                <li>• Loyalty programs for long-term shareholders</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-green-400 mb-2">🛡️ Regulated Systems</h4>
              <ul className="space-y-2 text-sm">
                <li>• Licensed under Uganda Mining Act</li>
                <li>• Regular compliance audits</li>
                <li>• Transparent financial reporting</li>
                <li>• Investor protection mechanisms</li>
              </ul>
            </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-bold text-green-400 mb-2">📊 Yawatu Audit & Compliance Summary</h4>
            <p className="text-sm">
              All company accounts are audited quarterly. Financial statements are publicly available. 
              Investor funds are held in segregated, company-controlled accounts with full regulatory oversight.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Let's Get Started",
      content: (
        <div className="space-y-6 text-center">
          <div className="bg-gradient-to-br from-yawatu-gold/20 to-yawatu-gold-dark/20 border border-yawatu-gold/30 rounded-lg p-6">
            <h3 className="text-3xl font-bold gold-text mb-4">You Can Start with Just 10 Shares!</h3>
            <p className="text-xl mb-4">Become an investor today and own a piece of Uganda's gold future</p>
            <div className="text-4xl font-bold text-yawatu-gold mb-2">10 Shares</div>
            <p className="text-green-400">Minimum investment to get started</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button size="lg" className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
              <Link to="/register">Register Now</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold/10">
              <Link to="/about">View Prospectus</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
              <Link to="/support">Talk to Support</Link>
            </Button>
          </div>
          
          <div className="text-sm text-gray-400">
            Questions? Our support team is available 24/7 to help you get started
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="bg-black text-white min-h-[600px] relative">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold gold-text">{slides[currentSlide].title}</h2>
            <div className="text-sm text-gray-400">
              {currentSlide + 1} / {slides.length}
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-yawatu-gold h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {slides[currentSlide].content}
        </div>

        <div className="flex justify-between items-center mt-8">
          <Button 
            variant="outline" 
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold/10"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide ? 'bg-yawatu-gold' : 'bg-gray-600'
                }`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>

          <Button 
            variant="outline" 
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold/10"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentSlidesModal;
