
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, MessageCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

const SupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      // Mock data - would load from support_tickets table when created
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          subject: 'Unable to purchase shares',
          description: 'I am getting an error when trying to purchase shares using my wallet balance.',
          category: 'shares',
          priority: 'high',
          status: 'in_progress',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T14:22:00Z'
        },
        {
          id: '2',
          subject: 'Dividend payment not received',
          description: 'I have not received my dividend payment for last quarter.',
          category: 'wallet',
          priority: 'medium',
          status: 'resolved',
          createdAt: '2024-01-10T09:15:00Z',
          updatedAt: '2024-01-12T16:45:00Z'
        }
      ];
      
      setTickets(mockTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newTicket: SupportTicket = {
        id: Date.now().toString(),
        ...formData,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setTickets(prev => [newTicket, ...prev]);
      setFormData({ subject: '', description: '', category: '', priority: 'medium' });
      setShowCreateForm(false);
      toast.success('Support ticket created successfully!');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading support tickets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Support Tickets</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Support Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="shares">Shares</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of your issue"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Ticket</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusIcon(ticket.status)}
                    <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {ticket.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Category: {ticket.category}</span>
                <span>Last updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No support tickets</p>
            <p className="text-sm text-muted-foreground">Create a ticket if you need help with anything</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupportTickets;
