import React, { useState } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  FileText,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Send
} from 'lucide-react';

const UserSupport = () => {
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Support' }
  ];

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketForm.subject || !ticketForm.category || !ticketForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    // Simulate ticket submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success('Support ticket submitted successfully!');
    setTicketForm({
      subject: '',
      category: '',
      priority: 'medium',
      description: ''
    });
    setLoading(false);
  };

  const mockTickets = [
    {
      id: '#T001',
      subject: 'Wallet withdrawal issue',
      category: 'Wallet',
      status: 'open',
      priority: 'high',
      created: '2024-01-15',
      lastUpdate: '2024-01-16'
    },
    {
      id: '#T002',
      subject: 'Share purchase problem',
      category: 'Shares',
      status: 'in_progress',
      priority: 'medium',
      created: '2024-01-14',
      lastUpdate: '2024-01-15'
    },
    {
      id: '#T003',
      subject: 'Profile verification',
      category: 'Account',
      status: 'resolved',
      priority: 'low',
      created: '2024-01-12',
      lastUpdate: '2024-01-13'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      case 'resolved':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <UserLayout title="Support Center" breadcrumbs={breadcrumbs}>
      <MobileBottomPadding>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">Support Center</h1>
            <p className="text-muted-foreground">
              Get help with your account, transactions, and platform features
            </p>
          </div>

          {/* Quick Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2 text-yawatu-gold" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Chat with our support team
                </p>
                <Button size="sm" className="w-full">
                  Start Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-yawatu-gold" />
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  support@yawatu.com
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Send Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-yawatu-gold" />
                  Phone Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  +256 xxx xxx xxx
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Call Now
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="tickets" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tickets">My Tickets</TabsTrigger>
              <TabsTrigger value="new-ticket">New Ticket</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Your Support Tickets
                  </CardTitle>
                  <CardDescription>
                    Track the status of your support requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(ticket.status)}
                          <div>
                            <div className="font-semibold">{ticket.subject}</div>
                            <div className="text-sm text-muted-foreground">
                              {ticket.id} • {ticket.category} • Created {ticket.created}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right text-sm">
                            <div className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority.toUpperCase()}
                            </div>
                            <div className="text-muted-foreground">
                              Updated {ticket.lastUpdate}
                            </div>
                          </div>
                          <Badge variant={getStatusVariant(ticket.status) as any}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="new-ticket" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Submit a Support Ticket
                  </CardTitle>
                  <CardDescription>
                    Describe your issue and we'll get back to you as soon as possible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          placeholder="Brief description of your issue"
                          value={ticketForm.subject}
                          onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={ticketForm.category}
                          onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="account">Account Issues</SelectItem>
                            <SelectItem value="wallet">Wallet & Payments</SelectItem>
                            <SelectItem value="shares">Share Trading</SelectItem>
                            <SelectItem value="verification">Verification</SelectItem>
                            <SelectItem value="technical">Technical Issues</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={ticketForm.priority}
                        onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - General inquiry</SelectItem>
                          <SelectItem value="medium">Medium - Account issue</SelectItem>
                          <SelectItem value="high">High - Urgent problem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Please provide detailed information about your issue..."
                        className="min-h-[120px]"
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        required
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Frequently Asked Questions
                  </CardTitle>
                  <CardDescription>
                    Find quick answers to common questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">How do I deposit money into my wallet?</h3>
                      <p className="text-sm text-muted-foreground">
                        Go to your Wallet page and click "Deposit". You can fund your wallet using mobile money, 
                        bank transfer, or other supported payment methods.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">How long does verification take?</h3>
                      <p className="text-sm text-muted-foreground">
                        Account verification typically takes 1-3 business days. Make sure to upload clear, 
                        valid documents to avoid delays.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">When are dividends paid?</h3>
                      <p className="text-sm text-muted-foreground">
                        Dividends are typically paid quarterly, subject to company performance and board decisions. 
                        You'll be notified when dividend payments are processed.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">How do I become an agent?</h3>
                      <p className="text-sm text-muted-foreground">
                        Visit the Agent Program page to submit an application. You'll need to meet certain 
                        requirements and complete the application process.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">Can I withdraw my shares?</h3>
                      <p className="text-sm text-muted-foreground">
                        Shares can be sold back to the company or transferred to other users, subject to 
                        company policies and market conditions.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MobileBottomPadding>
    </UserLayout>
  );
};

export default UserSupport;