
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Users, Clock, Award, ArrowRight } from 'lucide-react';
import PublicSharePurchaseForm from '@/components/public/PublicSharePurchaseForm';

const PublicShares = () => {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-black to-yawatu-black-light">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="gold-text">Start with Just 10 Shares</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                Become an investor in Uganda's gold mining industry today! 
                Own a piece of Yawatu 256 PLC with just 10 shares.
              </p>
              
              {/* Advertisement Box */}
              <div className="bg-gradient-to-r from-yawatu-gold/20 to-yawatu-gold-dark/20 border-2 border-yawatu-gold rounded-lg p-8 max-w-2xl mx-auto mb-8">
                <div className="text-center">
                  <div className="text-6xl font-bold gold-text mb-4 animate-pulse">10</div>
                  <div className="text-2xl font-bold text-white mb-2">SHARES</div>
                  <div className="text-lg text-yawatu-gold mb-4">Minimum to Become an Investor</div>
                  <div className="space-y-2 text-sm text-gray-300 mb-6">
                    <p>✓ Immediate ownership certificate</p>
                    <p>✓ Access to all investor benefits</p>
                    <p>✓ 24/7 digital trading capabilities</p>
                    <p>✓ Eligible for dividends when declared</p>
                  </div>
                  <Button size="lg" className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark font-bold">
                    <Link to="#purchase-form">Buy Shares Now</Link>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div id="purchase-form">
                <PublicSharePurchaseForm />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold gold-text">Why Start with 10 Shares?</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-6 w-6 text-yawatu-gold mt-1" />
                    <div>
                      <h3 className="font-semibold">Immediate Investor Status</h3>
                      <p className="text-gray-400">Become a legal shareholder with voting rights and certificate</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-yawatu-gold mt-1" />
                    <div>
                      <h3 className="font-semibold">Low Entry Barrier</h3>
                      <p className="text-gray-400">Start small and scale up your investment over time</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-6 w-6 text-yawatu-gold mt-1" />
                    <div>
                      <h3 className="font-semibold">Join the Community</h3>
                      <p className="text-gray-400">Connect with thousands of Ugandan investors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Current Share Information */}
        <section className="py-20 bg-yawatu-black-light">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="gold-text">Share Information</span>
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-black/50 border-yawatu-gold/20">
                <CardHeader>
                  <CardTitle className="text-yawatu-gold">Current Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">UGX 20,000</p>
                  <p className="text-gray-400">Initial offering price</p>
                  <p className="text-sm text-green-400 mt-2">Just 10 shares = UGX 200,000</p>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-yawatu-gold/20">
                <CardHeader>
                  <CardTitle className="text-yawatu-gold">Target Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">150%+</p>
                  <p className="text-gray-400">over 3 years</p>
                  <p className="text-sm text-green-400 mt-2">Plus dividend payments</p>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-yawatu-gold/20">
                <CardHeader>
                  <CardTitle className="text-yawatu-gold">Your Investment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yawatu-gold">10</p>
                  <p className="text-gray-400">shares minimum</p>
                  <p className="text-sm text-blue-400 mt-2">Instant investor status</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Investment Benefits */}
        <section className="py-20 bg-black">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="gold-text">Shareholder Benefits</span>
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-black/50 border-yawatu-gold/20 text-center">
                <CardHeader>
                  <Award className="h-8 w-8 text-yawatu-gold mx-auto" />
                  <CardTitle>Ownership Rights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    Digital ownership certificate and voting rights in company decisions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-yawatu-gold/20 text-center">
                <CardHeader>
                  <TrendingUp className="h-8 w-8 text-yawatu-gold mx-auto" />
                  <CardTitle>Profit Sharing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    Receive dividends from mining profits once operations break even
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-yawatu-gold/20 text-center">
                <CardHeader>
                  <Clock className="h-8 w-8 text-yawatu-gold mx-auto" />
                  <CardTitle>24/7 Trading</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    Buy, sell, and transfer shares anytime through our mobile platform
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-yawatu-gold/20 text-center">
                <CardHeader>
                  <Users className="h-8 w-8 text-yawatu-gold mx-auto" />
                  <CardTitle>Exclusive Rewards</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    Top 100 shareholders qualify for branded gold bars and bonuses
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 bg-gradient-to-b from-yawatu-black-light to-black">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to <span className="gold-text">Become an Investor?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of Ugandans building wealth through gold mining. Start with just 10 shares today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
                <Link to="/register">Register & Buy Shares</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold/10">
                <Link to="/about">View Full Prospectus</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PublicShares;
