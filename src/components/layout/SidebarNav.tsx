import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  User, 
  Wallet, 
  TrendingUp, 
  Settings, 
  HelpCircle,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';

const SidebarNav = () => {
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/dashboard/profile', icon: User, label: 'Profile' },
    { to: '/dashboard/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/dashboard/investments', icon: TrendingUp, label: 'Investments' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
    { to: '/dashboard/help', icon: HelpCircle, label: 'Help & Support' },
  ];

  const contactItems = [
    { 
      href: 'tel:+256700000000', 
      icon: Phone, 
      label: 'Call Us',
      external: true 
    },
    { 
      href: 'https://wa.me/256700000000', 
      icon: MessageSquare, 
      label: 'WhatsApp',
      external: true 
    },
    { 
      href: 'mailto:info@yawatuminerals.com', 
      icon: Mail, 
      label: 'Email',
      external: true 
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header with Logo and Theme Toggle */}
      <div className="p-4 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center bg-primary/5 rounded-lg">
              <img 
                src="/lovable-uploads/20f4ac2e-05d8-4232-a9e9-fb42d42e4b18.png" 
                alt="Yawatu Minerals Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm gold-text">Yawatu Minerals</span>
              <span className="text-xs text-muted-foreground">& Mining PLC</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Contact Section */}
      <div className="p-4 pt-0 mt-auto border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Contact Us
        </h4>
        <div className="space-y-1">
          {contactItems.map((item) => {
            const Icon = item.icon;
            
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            }
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SidebarNav;