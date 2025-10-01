import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const DetailedAnalytics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Detailed Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Advanced analytics dashboard coming soon...</p>
          <p className="text-sm mt-2">Will include user behavior analysis, conversion metrics, and performance insights.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedAnalytics;