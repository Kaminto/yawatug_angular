import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Mail, 
  Bell, 
  MessageCircle, 
  Megaphone,
  FileText
} from 'lucide-react';

const CommunicationCenter = () => {
  const [activeSection, setActiveSection] = useState('campaigns');

  // Mock notification counts - would come from real data
  const sectionCounts = {
    campaigns: 3,
    reminders: 15,
    tickets: 2,
    announcements: 1,
    templates: 8
  };

  const sections = [
    {
      id: 'campaigns',
      label: 'Activation Campaigns',
      icon: Mail,
      description: 'Email invitations for imported users',
      count: sectionCounts.campaigns,
      variant: 'default' as const
    },
    {
      id: 'reminders',
      label: 'Verification Reminders',
      icon: Bell,
      description: 'Automated and manual follow-ups',
      count: sectionCounts.reminders,
      variant: 'secondary' as const
    },
    {
      id: 'tickets',
      label: 'Support Tickets',
      icon: MessageCircle,
      description: 'User inquiries and issues',
      count: sectionCounts.tickets,
      variant: 'destructive' as const
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      description: 'System-wide notifications',
      count: sectionCounts.announcements,
      variant: 'default' as const
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: FileText,
      description: 'Standardized communications',
      count: sectionCounts.templates,
      variant: 'default' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Communication Center</h2>
          <p className="text-muted-foreground">Centralized user communication and messaging hub</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full h-auto p-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {section.count > 0 && (
                    <Badge variant={section.variant} className="px-1.5 py-0.5 text-xs">
                      {section.count}
                    </Badge>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{section.label}</div>
                  <div className="text-xs text-muted-foreground hidden lg:block">
                    {section.description}
                  </div>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Section Content */}
        <div className="mt-6">
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Activation Campaigns ({sectionCounts.campaigns})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage email invitation campaigns for imported users to activate their accounts.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Activation campaigns component will be implemented here</p>
                  <p className="text-sm">Create and send invitation emails to imported users</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Verification Reminders ({sectionCounts.reminders})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Send automated and manual follow-up reminders for pending verifications.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Verification reminders component will be implemented here</p>
                  <p className="text-sm">Automated follow-ups for incomplete verifications</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Support Tickets ({sectionCounts.tickets})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage user inquiries, issues, and support requests.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Support tickets component will be implemented here</p>
                  <p className="text-sm">Handle user support requests and inquiries</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Announcements ({sectionCounts.announcements})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create and manage system-wide announcements and notifications.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Announcements management component will be implemented here</p>
                  <p className="text-sm">Broadcast important messages to all users</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Communication Templates ({sectionCounts.templates})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage standardized email and message templates for consistent communication.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Templates management component will be implemented here</p>
                  <p className="text-sm">Create and edit communication templates</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CommunicationCenter;