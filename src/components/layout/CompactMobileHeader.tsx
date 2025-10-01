import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CompactMobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
  notificationCount?: number;
}

export const CompactMobileHeader: React.FC<CompactMobileHeaderProps> = ({
  title = "Dashboard",
  showNotifications = true,
  notificationCount = 0
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50 px-3 py-2 md:hidden">
      <div className="flex items-center justify-between">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-2">
          <img 
            src="/yawatu-logo.png" 
            alt="Yawatu" 
            className="h-6 w-6 object-contain drop-shadow-sm" 
          />
          <h1 className="text-base font-semibold text-foreground truncate">
            {title}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {showNotifications && (
            <Button 
              variant="ghost" 
              size="sm"
              className="relative p-2 h-8 w-8"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 h-8 w-8"
            onClick={() => navigate('/profile')}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};