import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  TrendingUp, 
  Wallet, 
  Users,
  User 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface MobileBottomNavigationProps {
  className?: string;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({ 
  className = '' 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check for sidebar overlays in DOM
  useEffect(() => {
    const checkSidebarOpen = () => {
      // Check for mobile sheet overlays or sidebar triggers that indicate an open sidebar
      const hasSheetOverlay = document.querySelector('[data-radix-popper-content-wrapper]') || 
                            document.querySelector('[role="dialog"]') ||
                            document.querySelector('[data-sheet-overlay]') ||
                            document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]');
      
      // Check for desktop expanded sidebar
      const hasExpandedSidebar = document.querySelector('[data-state="expanded"]');
      
      setIsSidebarOpen(Boolean(hasSheetOverlay || hasExpandedSidebar));
    };

    // Check immediately and on DOM changes
    checkSidebarOpen();
    
    const observer = new MutationObserver(checkSidebarOpen);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'data-sheet-overlay', 'role']
    });

    return () => observer.disconnect();
  }, []);

  // Don't show navigation if user is not logged in or sidebar is open
  if (!user || isSidebarOpen) {
    return null;
  }

  const navigationItems = [
    {
      icon: TrendingUp,
      label: 'Shares',
      path: '/user-shares',
      badge: null
    },
    {
      icon: Wallet,
      label: 'Wallet',
      path: '/wallet',
      badge: null
    },
    {
      icon: Users,
      label: 'Referrals', 
      path: '/referrals',
      badge: null
    },
    {
      icon: User,
      label: 'Profile',
      path: '/profile',
      badge: null
    }
  ];

  const handleNavigation = (item: any) => {
    navigate(item.path);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-[60] bg-background/98 backdrop-blur-md border-t border-border/50",
      "md:hidden", // Only show on mobile
      "safe-area-pb", // Handle safe area on mobile devices
      className
    )}>
      <nav className="flex items-center justify-around py-1.5 px-2 max-w-md mx-auto h-16">
        {navigationItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation(item)}
            className={cn(
              "flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 relative",
              "min-w-0 flex-1 min-h-[44px]", // Ensure touch target size
              isActivePath(item.path) && "text-primary bg-primary/10 rounded-lg"
            )}
          >
            <div className="relative">
              <item.icon className="h-4 w-4" />
              {item.badge && (
                <Badge 
                  className="absolute -top-1 -right-1 h-3 w-3 p-0 text-[10px] flex items-center justify-center bg-destructive text-destructive-foreground"
                >
                  {item.badge}
                </Badge>
              )}
            </div>
            <span className="text-[10px] font-medium truncate leading-tight">{item.label}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
};