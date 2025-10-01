// Yawatu Assistant floating action button for mobile
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedChatBot } from '@/components/chat/EnhancedChatBot';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminUser } from '@/contexts/AdminUserContext';

interface YawatuAssistantFABProps {
  className?: string;
}

export const QuickActionsFAB: React.FC<YawatuAssistantFABProps> = ({ 
  className = '' 
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();
  const { originalAdmin } = useAdminUser();

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Only show if user is logged in
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Yawatu Assistant FAB - Single clear responsive button */}
      <div className={cn(
        "fixed bottom-20 right-4 z-[60] sm:bottom-6 sm:right-6",
        "transition-all duration-300 ease-in-out",
        className
      )}>
        <Button
          size="lg"
          onClick={handleToggleChat}
          className={cn(
            "h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl",
            "transition-all duration-300 ease-in-out",
            "bg-primary hover:bg-primary/90 hover:scale-110 active:scale-95",
            "text-primary-foreground border-2 border-white/20",
            "backdrop-blur-sm",
            isChatOpen && "bg-red-500 hover:bg-red-600"
          )}
          title={isChatOpen ? "Close Yawatu Assistant" : "Open Yawatu Assistant"}
        >
          {isChatOpen ? (
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </Button>
      </div>

      {/* Enhanced ChatBot - Fixed positioning for responsive design */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[50] bg-black/20 backdrop-blur-sm sm:inset-4 sm:rounded-lg sm:shadow-2xl overflow-hidden">
          <div className="h-full w-full bg-background sm:rounded-lg">
            <EnhancedChatBot
              userRole={originalAdmin ? 'admin' : 'user'}
            />
          </div>
        </div>
      )}
    </>
  );
};