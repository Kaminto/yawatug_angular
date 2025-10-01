
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  Wallet, 
  ShoppingCart, 
  FileText, 
  ArrowLeftRight, 
  TrendingUp,
  Shield,
  Award
} from 'lucide-react';

const InvestmentGuide = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-black to-yawatu-black-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gold-text">Investment Guide</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about investing in Yawatu 256 PLC
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* How to Buy Shares */}
          <Card className="bg-black/50 border-yawatu-gold/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yawatu-gold">
                <ShoppingCart className="h-5 w-5" />
                How to Buy Shares
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yawatu-gold rounded-full flex items-center justify-center text-black font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-white">Register and verify your account</p>
                  <p className="text-sm text-gray-400">Complete KYC process with ID verification</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yawatu-gold rounded-full flex items-center justify-center text-black font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-white">Deposit UGX or USD in your wallet</p>
                  <p className="text-sm text-gray-400">Multiple payment methods available</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yawatu-gold rounded-full flex items-center justify-center text-black font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-white">Tap "Buy Shares" and enter amount</p>
                  <p className="text-sm text-gray-400">Minimum: 10 shares to become an investor</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yawatu-gold rounded-full flex items-center justify-center text-black font-bold text-sm">4</div>
                <div>
                  <p className="font-medium text-white">Receive digital shares + ownership certificate</p>
                  <p className="text-sm text-gray-400">Instant confirmation and documentation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How to Sell or Exit */}
          <Card className="bg-black/50 border-yawatu-gold/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yawatu-gold">
                <ArrowLeftRight className="h-5 w-5" />
                How to Sell or Exit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yawatu-gold rounded-full"></div>
                  <p className="text-gray-300">Sell back to share pool if liquidity available</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yawatu-gold rounded-full"></div>
                  <p className="text-gray-300">Transfer shares to another investor instantly (peer-to-peer)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yawatu-gold rounded-full"></div>
                  <p className="text-gray-300">24/7 trading with real-time settlement</p>
                </div>
              </div>
              <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4 mt-4">
                <p className="text-yawatu-gold font-semibold text-sm">
                  Exit strategies designed for maximum flexibility and liquidity
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Return Expectations */}
        <Card className="bg-black/50 border-yawatu-gold/20 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yawatu-gold">
              <TrendingUp className="h-5 w-5" />
              Return Expectations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-yawatu-gold/20 to-yawatu-gold-dark/20 rounded-lg p-4">
                  <h4 className="text-yawatu-gold font-bold text-lg mb-2">1st Year Target</h4>
                  <p className="text-2xl font-bold text-white">UGX 34,000</p>
                  <p className="text-sm text-gray-400">per share value</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-4">
                  <h4 className="text-green-400 font-bold text-lg mb-2">3rd Year Target</h4>
                  <p className="text-2xl font-bold text-white">UGX 50,000</p>
                  <p className="text-sm text-gray-400">per share equivalent</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4">
                  <h4 className="text-blue-400 font-bold text-lg mb-2">Dividends</h4>
                  <p className="text-xl font-bold text-white">6-12 months</p>
                  <p className="text-sm text-gray-400">post break-even</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Regulation */}
        <Card className="bg-black/50 border-yawatu-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yawatu-gold">
              <Shield className="h-5 w-5" />
              Security & Regulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-yawatu-gold" />
                  <p className="text-gray-300">Regulated under Uganda Mining and Securities Act</p>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-yawatu-gold" />
                  <p className="text-gray-300">Prospecting License granted; Exploration License expected</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-yawatu-gold" />
                  <p className="text-gray-300">All funds held in company-controlled accounts</p>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-yawatu-gold" />
                  <p className="text-gray-300">Regular audits and compliance reporting</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default InvestmentGuide;
