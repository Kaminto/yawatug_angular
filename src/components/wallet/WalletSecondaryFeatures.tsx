import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, BarChart, Target, Lightbulb } from 'lucide-react';

const WalletSecondaryFeatures: React.FC = () => {
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const sections = [
    {
      id: 'spending',
      title: 'Spending Analysis',
      icon: <BarChart className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            View your spending patterns and budget insights here.
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">Coming soon: Detailed spending analytics and charts</p>
          </div>
        </div>
      )
    },
    {
      id: 'goals',
      title: 'Financial Goals',
      icon: <Target className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Set and track your financial goals like Emergency Fund and Share Investment.
          </div>
          <div className="grid gap-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Emergency Fund</span>
                <span className="text-sm text-green-600">Coming Soon</span>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Share Investment</span>
                <span className="text-sm text-blue-600">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'insights',
      title: 'Smart Insights',
      icon: <Lightbulb className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Get personalized opportunities and reminders to optimize your finances.
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Investment Opportunity
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Consider investing in shares to grow your wealth over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <Card className="max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle>Additional Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => (
          <Collapsible 
            key={section.id}
            open={openSections.includes(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-4 h-auto border border-border hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span className="font-medium">{section.title}</span>
                </div>
                {openSections.includes(section.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              {section.content}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};

export default WalletSecondaryFeatures;