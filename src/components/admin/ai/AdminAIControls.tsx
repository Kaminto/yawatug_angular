import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Settings, 
  Users, 
  MessageSquare, 
  BarChart3,
  Database,
  Shield,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminAIControlsProps {
  className?: string;
}

const AdminAIControls: React.FC<AdminAIControlsProps> = ({ className }) => {
  const [activeSection, setActiveSection] = useState('overview');

  // Fetch AI conversation analytics
  const { data: conversationStats } = useQuery({
    queryKey: ['ai-conversation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_conversation_logs')
        .select('user_role, created_at, metadata');
      
      if (error) throw error;
      
      const today = new Date().toISOString().split('T')[0];
      const todayConversations = data?.filter(c => 
        c.created_at.startsWith(today)
      ) || [];
      
      const adminConversations = data?.filter(c => c.user_role === 'admin') || [];
      const userConversations = data?.filter(c => c.user_role === 'user') || [];
      
      return {
        total: data?.length || 0,
        today: todayConversations.length,
        admin: adminConversations.length,
        user: userConversations.length,
        avgPerDay: Math.round((data?.length || 0) / 7)
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const adminFeatures = [
    {
      id: 'user-management',
      title: 'User Management AI',
      description: 'Query user data, manage accounts, and get insights',
      icon: Users,
      capabilities: [
        'Search users by any criteria',
        'Bulk user operations',
        'Account status management',
        'Verification assistance'
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics AI',
      description: 'Generate reports and analyze platform data',
      icon: BarChart3,
      capabilities: [
        'Transaction analysis',
        'User behavior insights',
        'Revenue reports',
        'Trend identification'
      ]
    },
    {
      id: 'system-control',
      title: 'System Control AI',
      description: 'Manage platform settings and configurations',
      icon: Settings,
      capabilities: [
        'Update system settings',
        'Manage share pricing',
        'Configure notifications',
        'Monitor system health'
      ]
    },
    {
      id: 'security',
      title: 'Security AI',
      description: 'Monitor security threats and manage compliance',
      icon: Shield,
      capabilities: [
        'Fraud detection',
        'Security alerts',
        'Compliance monitoring',
        'Risk assessment'
      ]
    }
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Statistics */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Usage Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {conversationStats?.total || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Conversations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {conversationStats?.today || 0}
                </div>
                <div className="text-sm text-muted-foreground">Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {conversationStats?.admin || 0}
                </div>
                <div className="text-sm text-muted-foreground">Admin Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {conversationStats?.avgPerDay || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg/Day</div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setActiveSection('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Detailed Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin AI Features */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Admin AI Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminFeatures.map((feature) => (
                <div 
                  key={feature.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setActiveSection(feature.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {feature.capabilities.map((capability, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className="text-sm">{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Admin Commands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Show Recent Users</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Database className="h-6 w-6" />
              <span className="text-sm">System Status</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Generate Report</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Shield className="h-6 w-6" />
              <span className="text-sm">Security Check</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAIControls;