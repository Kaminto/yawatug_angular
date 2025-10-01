import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const AdvancedReports = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Advanced Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Advanced reporting features coming soon...</p>
          <p className="text-sm mt-2">Will include customizable reports, data exports, and scheduled reporting.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedReports;