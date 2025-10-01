import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, FileText, Clock, RefreshCw, CheckCircle, ChevronDown } from 'lucide-react';

interface ShareBookingTermsProps {
  isAccepted: boolean;
  onAcceptanceChange: (accepted: boolean) => void;
  creditPeriodDays: number;
}

const ShareBookingTerms: React.FC<ShareBookingTermsProps> = ({ 
  isAccepted, 
  onAcceptanceChange,
  creditPeriodDays = 35
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const terms = [
    {
      icon: CheckCircle,
      title: 'Share Reservation',
      description: 'Shares will be reserved in your name upon down payment confirmation',
      type: 'positive'
    },
    {
      icon: Clock,
      title: 'Payment Period',
      description: `Full payment must be completed within ${creditPeriodDays} days from booking date`,
      type: 'warning'
    },
    {
      icon: RefreshCw,
      title: 'Extension Option',
      description: 'You can request one extension period (subject to admin approval)',
      type: 'info'
    },
    {
      icon: FileText,
      title: 'Ownership Transfer',
      description: 'Share ownership transfers only apply to shares paid for by expiry due date',
      type: 'info'
    }
  ];

  return (
    <div className="space-y-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg text-sm font-medium hover:bg-muted/70 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Terms & Conditions
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-24 w-full rounded border mt-2">
            <div className="p-3 space-y-3">
              {terms.map((term, index) => {
                const IconComponent = term.icon;
                return (
                  <div key={index} className="flex gap-2">
                    <div className={`
                      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                      ${term.type === 'positive' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : ''}
                      ${term.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : ''}
                      ${term.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : ''}
                      ${term.type === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : ''}
                    `}>
                      <IconComponent className="h-3 w-3" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-xs">{term.title}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {term.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
        <Checkbox 
          id="terms-acceptance"
          checked={isAccepted}
          onCheckedChange={onAcceptanceChange}
          className="mt-0.5"
        />
        <label 
          htmlFor="terms-acceptance" 
          className="text-sm text-foreground leading-relaxed cursor-pointer"
        >
          I have read and agree to the terms and conditions above. I understand the payment requirements and extension options outlined above.
        </label>
      </div>
    </div>
  );
};

export default ShareBookingTerms;