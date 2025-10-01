import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Bot, Settings, MessageSquare } from 'lucide-react';
import AdminAIControls from '@/components/admin/ai/AdminAIControls';
import ImportUserReconciliation from '@/components/admin/sections/ImportUserReconciliation';
import { EnhancedChatBot } from '@/components/chat/EnhancedChatBot';

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  is_active: boolean;
}

const AdminChatbot = () => {
  const [newEntry, setNewEntry] = useState({
    question: '',
    answer: '',
    category: 'general',
    keywords: '',
  });
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [isChatBotMinimized, setIsChatBotMinimized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: knowledgeEntries, isLoading } = useQuery({
    queryKey: ['chatbot-knowledge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatbot_knowledge')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeEntry[];
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      const { error } = await supabase
        .from('chatbot_knowledge')
        .insert({
          question: entry.question,
          answer: entry.answer,
          category: entry.category,
          keywords: entry.keywords.split(',').map(k => k.trim()),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-knowledge'] });
      setNewEntry({ question: '', answer: '', category: 'general', keywords: '' });
      toast({
        title: "Success",
        description: "Knowledge entry added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add knowledge entry",
        variant: "destructive",
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async (entry: KnowledgeEntry) => {
      const { error } = await supabase
        .from('chatbot_knowledge')
        .update({
          question: entry.question,
          answer: entry.answer,
          category: entry.category,
          keywords: entry.keywords,
          is_active: entry.is_active,
        })
        .eq('id', entry.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-knowledge'] });
      setEditingEntry(null);
      toast({
        title: "Success",
        description: "Knowledge entry updated successfully",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chatbot_knowledge')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-knowledge'] });
      toast({
        title: "Success",
        description: "Knowledge entry deleted successfully",
      });
    },
  });

  const handleAddEntry = () => {
    if (!newEntry.question || !newEntry.answer) {
      toast({
        title: "Error",
        description: "Question and answer are required",
        variant: "destructive",
      });
      return;
    }
    addEntryMutation.mutate(newEntry);
  };

  const handleUpdateEntry = (entry: KnowledgeEntry) => {
    updateEntryMutation.mutate(entry);
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntryMutation.mutate(id);
  };

  if (isLoading) {
    return <div>Loading chatbot knowledge...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin AI & Chatbot Management</h1>
        <Button 
          variant="outline" 
          onClick={() => setIsChatBotMinimized(!isChatBotMinimized)}
        >
          <Bot className="h-4 w-4 mr-2" />
          {isChatBotMinimized ? 'Show' : 'Hide'} Admin Assistant
        </Button>
      </div>

      <Tabs defaultValue="ai-controls" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ai-controls">
            <Bot className="h-4 w-4 mr-2" />
            AI Controls
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <Settings className="h-4 w-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            <MessageSquare className="h-4 w-4 mr-2" />
            User Reconciliation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-controls">
          <AdminAIControls />
        </TabsContent>

        <TabsContent value="reconciliation">
          <ImportUserReconciliation />
        </TabsContent>

        <TabsContent value="knowledge">
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Knowledge Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Question"
            value={newEntry.question}
            onChange={(e) => setNewEntry({ ...newEntry, question: e.target.value })}
          />
          <Textarea
            placeholder="Answer"
            value={newEntry.answer}
            onChange={(e) => setNewEntry({ ...newEntry, answer: e.target.value })}
          />
          <Select value={newEntry.category} onValueChange={(value) => setNewEntry({ ...newEntry, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="company">Company Info</SelectItem>
              <SelectItem value="investment">Investment</SelectItem>
              <SelectItem value="shares">Shares & Trading</SelectItem>
              <SelectItem value="wallet">Wallet & Payments</SelectItem>
              <SelectItem value="mining">Mining Operations</SelectItem>
              <SelectItem value="security">Security & Trust</SelectItem>
              <SelectItem value="referrals">Referrals & Agents</SelectItem>
              <SelectItem value="app">App Features</SelectItem>
              <SelectItem value="support">Support & Help</SelectItem>
              <SelectItem value="guidance">Page Guidance</SelectItem>
              <SelectItem value="sustainability">Sustainability</SelectItem>
              <SelectItem value="getting_started">Getting Started</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Keywords (comma separated)"
            value={newEntry.keywords}
            onChange={(e) => setNewEntry({ ...newEntry, keywords: e.target.value })}
          />
          <Button onClick={handleAddEntry} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Knowledge Entry
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Knowledge Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {knowledgeEntries?.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4">
                {editingEntry?.id === entry.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editingEntry.question}
                      onChange={(e) => setEditingEntry({ ...editingEntry, question: e.target.value })}
                    />
                    <Textarea
                      value={editingEntry.answer}
                      onChange={(e) => setEditingEntry({ ...editingEntry, answer: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateEntry(editingEntry)}>Save</Button>
                      <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg">{entry.question}</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingEntry(entry)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-2">{entry.answer}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="bg-primary/10 px-2 py-1 rounded">{entry.category}</span>
                      <span>Keywords: {entry.keywords?.join(', ')}</span>
                      <span className={entry.is_active ? 'text-green-600' : 'text-red-600'}>
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Admin AI Assistant */}
      {!isChatBotMinimized && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm p-4">
          <div className="h-full w-full bg-background rounded-lg shadow-2xl relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChatBotMinimized(true)}
              className="absolute top-2 right-2 z-10"
            >
              ✕
            </Button>
            <EnhancedChatBot
              userRole="admin"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatbot;