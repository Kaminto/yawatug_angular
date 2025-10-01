import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import AdminVotingDashboard from '@/components/voting/AdminVotingDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Vote, Plus, BarChart3, Users, Calendar } from 'lucide-react';

const AdminVoting = () => {
  return (
    <UnifiedLayout title="Voting Management">
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">
            Manage voting proposals, monitor participation, and configure voting settings
          </p>
        </div>

        <AdminVotingDashboard />
      </div>
    </UnifiedLayout>
  );
};

export default AdminVoting;
