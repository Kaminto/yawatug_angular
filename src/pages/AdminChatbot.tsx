import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Save, Users, UserCheck, Shield, MessageSquare, Mic, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface ChatbotConfig {
  id: string;
  user_type: 'visitor' | 'user' | 'admin';
  welcome_message: string;
  system_instructions: string;
  voice_enabled: boolean;
  voice_type: string;
  voice_speed: number;
  is_active: boolean;
}

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  target_user_types: string[];
  is_active: boolean;
}

const AdminChatbot = () => {
  const [selectedUserType, setSelectedUserType] = useState<'visitor' | 'user' | 'admin'>('visitor');
  const [editedConfig, setEditedConfig] = useState<Partial<ChatbotConfig>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newEntry, setNewEntry] = useState({
    question: '',
    answer: '',
    category: 'general',
    keywords: '',
    target_user_types: ['visitor', 'user', 'admin'],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chatbot configurations
  const { data: configs } = useQuery({
    queryKey: ['chatbot-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatbot_configurations')
        .select('*')
        .order('user_type');
      if (error) throw error;
      return data as ChatbotConfig[];
    },
  });

  // Fetch knowledge entries
  const { data: knowledgeEntries } = useQuery({
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

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<ChatbotConfig> & { id: string }) => {
      const { error } = await supabase
        .from('chatbot_configurations')
        .update(config)
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-configurations'] });
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
    },
  });

  // Add knowledge entry mutation
  const addEntryMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      const { error } = await supabase
        .from('chatbot_knowledge')
        .insert({
          question: entry.question,
          answer: entry.answer,
          category: entry.category,
          keywords: entry.keywords.split(',').map(k => k.trim()),
          target_user_types: entry.target_user_types,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-knowledge'] });
      setNewEntry({
        question: '',
        answer: '',
        category: 'general',
        keywords: '',
        target_user_types: ['visitor', 'user', 'admin'],
      });
      toast({
        title: "Success",
        description: "FAQ entry added successfully",
      });
    },
  });

  const currentConfig = configs?.find(c => c.user_type === selectedUserType);
  const displayConfig = { ...currentConfig, ...editedConfig } as ChatbotConfig;

  const handleLocalEdit = (field: keyof ChatbotConfig, value: any) => {
    setEditedConfig(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveConfig = async () => {
    if (currentConfig && Object.keys(editedConfig).length > 0) {
      await updateConfigMutation.mutateAsync({
        id: currentConfig.id,
        ...editedConfig,
      });
      setEditedConfig({});
      setHasUnsavedChanges(false);
    }
  };

  const handleUserTypeChange = (type: 'visitor' | 'user' | 'admin') => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Switch user type anyway?')) {
        return;
      }
    }
    setSelectedUserType(type);
    setEditedConfig({});
    setHasUnsavedChanges(false);
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'visitor': return <Users className="h-4 w-4" />;
      case 'user': return <UserCheck className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'visitor': return 'bg-blue-500';
      case 'user': return 'bg-green-500';
      case 'admin': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Chatbot Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure AI assistants for different user types
          </p>
        </div>
      </div>

      <Tabs defaultValue="configurations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configurations">
            <Bot className="h-4 w-4 mr-2" />
            Configurations
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <MessageSquare className="h-4 w-4 mr-2" />
            Knowledge Base & FAQs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-6">
          {/* User Type Selector */}
          <div className="flex gap-2">
          {['visitor', 'user', 'admin'].map((type) => (
            <Button
              key={type}
              variant={selectedUserType === type ? 'default' : 'outline'}
              onClick={() => handleUserTypeChange(type as any)}
              className="flex items-center gap-2"
            >
              {getUserTypeIcon(type)}
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
          </div>

          {currentConfig && (
            <div className="space-y-6">
              {/* Unsaved Changes Banner */}
              {hasUnsavedChanges && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      You have unsaved changes
                    </p>
                  </div>
                  <Button onClick={handleSaveConfig} size="sm">
                    Save All Changes
                  </Button>
                </div>
              )}

              {/* Welcome Message */}
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Message</CardTitle>
                  <CardDescription>
                    The first message users see when opening the chatbot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={displayConfig.welcome_message}
                    onChange={(e) => handleLocalEdit('welcome_message', e.target.value)}
                    rows={4}
                    placeholder="Enter welcome message..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={displayConfig.is_active}
                        onCheckedChange={(checked) => handleLocalEdit('is_active', checked)}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle>System Instructions</CardTitle>
                  <CardDescription>
                    AI behavior and personality for this user type
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={displayConfig.system_instructions}
                    onChange={(e) => handleLocalEdit('system_instructions', e.target.value)}
                    rows={8}
                    placeholder="Enter system instructions..."
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              {/* Voice Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Voice Settings
                  </CardTitle>
                  <CardDescription>
                    Configure text-to-speech capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Voice</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to hear AI responses
                      </p>
                    </div>
                    <Switch
                      checked={displayConfig.voice_enabled}
                      onCheckedChange={(checked) => handleLocalEdit('voice_enabled', checked)}
                    />
                  </div>

                  {displayConfig.voice_enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Voice Type</Label>
                        <Select
                          value={displayConfig.voice_type}
                          onValueChange={(value) => handleLocalEdit('voice_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                            <SelectItem value="echo">Echo (Male)</SelectItem>
                            <SelectItem value="fable">Fable (British Male)</SelectItem>
                            <SelectItem value="onyx">Onyx (Deep Male)</SelectItem>
                            <SelectItem value="nova">Nova (Female)</SelectItem>
                            <SelectItem value="shimmer">Shimmer (Soft Female)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Voice Speed</Label>
                          <span className="text-sm text-muted-foreground">
                            {displayConfig.voice_speed}x
                          </span>
                        </div>
                        <Slider
                          value={[displayConfig.voice_speed]}
                          onValueChange={([value]) => handleLocalEdit('voice_speed', value)}
                          min={0.25}
                          max={4}
                          step={0.25}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0.25x (Slower)</span>
                          <span>4.0x (Faster)</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Save Button at Bottom */}
              {hasUnsavedChanges && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveConfig} size="lg">
                    <Save className="h-4 w-4 mr-2" />
                    Save All Changes
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          {/* Add New FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Add New FAQ Entry</CardTitle>
              <CardDescription>
                Create knowledge base entries for specific user types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  placeholder="What can users ask?"
                  value={newEntry.question}
                  onChange={(e) => setNewEntry({ ...newEntry, question: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Answer</Label>
                <Textarea
                  placeholder="How should the AI respond?"
                  value={newEntry.answer}
                  onChange={(e) => setNewEntry({ ...newEntry, answer: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newEntry.category}
                    onValueChange={(value) => setNewEntry({ ...newEntry, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="shares">Shares & Trading</SelectItem>
                      <SelectItem value="wallet">Wallet & Payments</SelectItem>
                      <SelectItem value="referrals">Referrals & Agents</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    placeholder="shares, invest, buy"
                    value={newEntry.keywords}
                    onChange={(e) => setNewEntry({ ...newEntry, keywords: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Show to User Types</Label>
                <div className="flex gap-2">
                  {['visitor', 'user', 'admin'].map((type) => (
                    <Button
                      key={type}
                      variant={newEntry.target_user_types.includes(type) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const updated = newEntry.target_user_types.includes(type)
                          ? newEntry.target_user_types.filter(t => t !== type)
                          : [...newEntry.target_user_types, type];
                        setNewEntry({ ...newEntry, target_user_types: updated });
                      }}
                      className="flex items-center gap-1"
                    >
                      {getUserTypeIcon(type)}
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => addEntryMutation.mutate(newEntry)}
                disabled={!newEntry.question || !newEntry.answer}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Add FAQ Entry
              </Button>
            </CardContent>
          </Card>

          {/* Existing FAQ Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Existing FAQ Entries</CardTitle>
              <CardDescription>
                {knowledgeEntries?.length || 0} entries in knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {knowledgeEntries?.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-semibold">{entry.question}</h4>
                        <p className="text-sm text-muted-foreground">{entry.answer}</p>
                      </div>
                      <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 items-center text-sm">
                      <Badge variant="outline">{entry.category}</Badge>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex gap-1">
                        {entry.target_user_types?.map((type) => (
                          <div key={type} className="flex items-center gap-1">
                            {getUserTypeIcon(type)}
                            <span className="text-xs">{type}</span>
                          </div>
                        ))}
                      </div>
                      {entry.keywords && entry.keywords.length > 0 && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            Keywords: {entry.keywords.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminChatbot;
