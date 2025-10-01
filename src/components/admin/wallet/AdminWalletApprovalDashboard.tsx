
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import TransactionApprovalWorkflow from './TransactionApprovalWorkflow';
import PendingApprovalsQueue from './PendingApprovalsQueue';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const AdminWalletApprovalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('workflow');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaction Approval Center</h1>
          <p className="text-muted-foreground">
            Comprehensive transaction approval and monitoring system
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Clock className="h-4 w-4 mr-1" />
          Real-time Updates
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Approval Workflow
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Approval Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <TransactionApprovalWorkflow />
        </TabsContent>

        <TabsContent value="queue">
          <PendingApprovalsQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminWalletApprovalDashboard;
