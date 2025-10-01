import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface MobileOptimizedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const MobileOptimizedDialog: React.FC<MobileOptimizedDialogProps> = ({
  open,
  onOpenChange,
  title,
  children,
  className = ""
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className={`max-h-[85vh] min-h-[50vh] overflow-y-auto rounded-t-xl ${className}`}
        >
          <SheetHeader className="pb-3">
            <SheetTitle className="text-left text-base font-semibold">{title}</SheetTitle>
          </SheetHeader>
          <div className="pb-4 space-y-4">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto ${className}`}>
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base sm:text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileOptimizedDialog;