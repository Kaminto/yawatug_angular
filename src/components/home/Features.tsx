
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Smartphone, 
  Shield, 
  TrendingUp, 
  Users, 
  Wallet, 
  ArrowRightLeft,
  Clock,
  Award
} from "lucide-react";

const Features = () => {
  return (
    <section className="py-20 bg-yawatu-black-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gold-text">Yawatu App Features</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Experience the future of mining investment with our comprehensive digital platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-black/50 border-yawatu-gold/20 hover:border-yawatu-gold/40 transition-all">
            <CardHeader>
              <Smartphone className="h-8 w-8 text-yawatu-gold mb-2" />
              <CardTitle className="text-white">Mobile-First Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Trade shares anytime, anywhere with our intuitive mobile app designed for modern investors.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yawatu-gold/20 hover:border-yawatu-gold/40 transition-all">
            <CardHeader>
              <Clock className="h-8 w-8 text-yawatu-gold mb-2" />
              <CardTitle className="text-white">24/7 Liquidity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Buy and sell shares around the clock with instant settlement and real-time processing.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yawatu-gold/20 hover:border-yawatu-gold/40 transition-all">
            <CardHeader>
              <ArrowRightLeft className="h-8 w-8 text-yawatu-gold mb-2" />
              <CardTitle className="text-white">Peer-to-Peer Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Transfer shares directly to other investors instantly with our P2P system.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yawatu-gold/20 hover:border-yawatu-gold/40 transition-all">
            <CardHeader>
              <Wallet className="h-8 w-8 text-yawatu-gold mb-2" />
              <CardTitle className="text-white">Multi-Currency Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Manage your investments in both UGX and USD with seamless currency conversion.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yawatu-gold/20 hover:border-yawatu-gold/40 transition-all">
            <CardHeader>
              <Shield className="h-8 w-8 text-yawatu-gold mb-2" />
              <CardTitle className="text-white">Regulated & Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Your investments are protected by Ugandan law and held in audited company accounts.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yawatu-gold/20 hover:border-yawatu-gold/40 transition-all">
            <CardHeader>
              <Award className="h-8 w-8 text-yawatu-gold mb-2" />
              <CardTitle className="text-white">Investor Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Earn referral bonuses and qualify for exclusive rewards including branded gold bars.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Features;
