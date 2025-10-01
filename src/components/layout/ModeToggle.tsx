
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, User, RefreshCw } from 'lucide-react';
import { useAdminUser } from '@/contexts/AdminUserContext';

const ModeToggle: React.FC = () => {
  const { isAdminMode, toggleMode, currentUser, originalAdmin } = useAdminUser();

  if (!originalAdmin) return null;

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-background">
      <div className="flex items-center gap-2">
        {isAdminMode ? (
          <Shield className="h-4 w-4 text-blue-600" />
        ) : (
          <User className="h-4 w-4 text-green-600" />
        )}
        <div className="flex flex-col min-w-0">
          <Badge 
            variant={isAdminMode ? "default" : "secondary"}
            className="text-xs w-fit"
          >
            {isAdminMode ? "Admin Mode" : "User Mode"}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {currentUser?.full_name || currentUser?.email || 'User'}
          </span>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMode}
        className="h-8 w-8 p-0"
        title={isAdminMode ? "Switch to User View" : "Switch to Admin View"}
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default ModeToggle;
