import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Facebook, Twitter, Linkedin, MessageCircle, Phone } from 'lucide-react';

const DashboardSocialFooter: React.FC = () => {
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Company Info & Social Links */}
          <div>
            <h3 className="font-semibold text-base md:text-lg mb-2 md:mb-3 text-foreground">Stay Connected</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
              Follow us for updates, insights, and news.
            </p>
            <div className="flex space-x-2 md:space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="p-1.5 md:p-2 hover:bg-primary hover:text-primary-foreground"
                onClick={() => window.open('https://facebook.com/yawatu256')}
              >
                <Facebook className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="p-1.5 md:p-2 hover:bg-primary hover:text-primary-foreground"
                onClick={() => window.open('https://twitter.com/yawatu256')}
              >
                <Twitter className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="p-1.5 md:p-2 hover:bg-primary hover:text-primary-foreground"
                onClick={() => window.open('https://linkedin.com/company/yawatu256')}
              >
                <Linkedin className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Support */}
          <div className="text-left">
            <h3 className="font-semibold text-base md:text-lg mb-2 md:mb-3 text-foreground">Need Help?</h3>
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm p-0 h-auto justify-start hover:text-primary"
                onClick={() => window.open('tel:+256766528157')}
              >
                <Phone className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Call Support: </span>+256 766 528 157
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm p-0 h-auto justify-start hover:text-primary"
                onClick={() => window.open('https://wa.me/256766528157')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">WhatsApp: </span>+256 766 528 157
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Available 24/7 for support
            </p>
          </div>
        </div>
        
        <div className="border-t border-border/50 mt-6 pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 Yawatu 256 PLC. Licensed by Uganda Securities Exchange. All investments carry risk.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardSocialFooter;