import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Send,
  FileText,
  Settings
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  name: string;
  template_type: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: string;
  is_active: boolean;
}

const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestSendOpen, setIsTestSendOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    template_type: '',
    subject: '',
    html_content: '',
    text_content: '',
    variables: '{}',
    is_active: true
  });

  const templateTypes = [
    'activation',
    'password_reset',
    'welcome',
    'verification',
    'notification',
    'marketing',
    'transaction',
    'reminder'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let parsedVariables;
      try {
        parsedVariables = JSON.parse(formData.variables);
      } catch {
        toast.error('Invalid JSON format for variables');
        return;
      }

      const templateData = {
        ...formData,
        variables: parsedVariables
      };

      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        // Create new template
        const { error } = await supabase
          .from('email_templates')
          .insert(templateData);

        if (error) throw error;
        toast.success('Template created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(`Failed to save template: ${error.message}`);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || '',
      variables: JSON.stringify(template.variables, null, 2),
      is_active: template.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleTestSend = async () => {
    if (!testEmail || !selectedTemplate) return;

    try {
      // Extract variables from template
      const variables = selectedTemplate.variables || {};
      const testVariables: Record<string, string> = {};
      
      // Fill with sample data
      Object.keys(variables).forEach(key => {
        testVariables[key] = `[Sample ${key}]`;
      });

      const { error } = await supabase.functions.invoke('unified-communication-sender', {
        body: {
          recipient: testEmail,
          subject: 'Test Email Template',
          message: 'Test email from template manager',
          channel: 'email',
          templateType: selectedTemplate.template_type,
          templateData: testVariables
        }
      });

      if (error) throw error;
      toast.success('Test email sent successfully');
      setIsTestSendOpen(false);
      setTestEmail('');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(`Failed to send test email: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      template_type: '',
      subject: '',
      html_content: '',
      text_content: '',
      variables: '{}',
      is_active: true
    });
    setSelectedTemplate(null);
  };

  const openNewTemplateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Templates</h2>
          <p className="text-muted-foreground">Create and manage email templates for different purposes</p>
        </div>
        <Button onClick={openNewTemplateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>Type: {template.template_type}</CardDescription>
                </div>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground truncate">
                  Subject: {template.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(template.updated_at).toLocaleDateString()}
                </p>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsTestSendOpen(true);
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate ? 'Update template details' : 'Create a new email template'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="template_type">Template Type</Label>
                <Select 
                  value={formData.template_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject (use {{variable}} for placeholders)"
                required
              />
            </div>

            <div>
              <Label htmlFor="html_content">HTML Content</Label>
              <Textarea
                id="html_content"
                value={formData.html_content}
                onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
                placeholder="HTML email content (use {{variable}} for placeholders)"
                rows={8}
                required
              />
            </div>

            <div>
              <Label htmlFor="text_content">Text Content (Optional)</Label>
              <Textarea
                id="text_content"
                value={formData.text_content}
                onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                placeholder="Plain text version of the email"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="variables">Variables (JSON)</Label>
              <Textarea
                id="variables"
                value={formData.variables}
                onChange={(e) => setFormData(prev => ({ ...prev, variables: e.target.value }))}
                placeholder='{"variable_name": "Description of variable"}'
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <p className="p-2 bg-muted rounded">{selectedTemplate.subject}</p>
              </div>
              <div>
                <Label>HTML Content</Label>
                <div 
                  className="p-4 border rounded bg-white max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content }}
                />
              </div>
              {selectedTemplate.text_content && (
                <div>
                  <Label>Text Content</Label>
                  <pre className="p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                    {selectedTemplate.text_content}
                  </pre>
                </div>
              )}
              <div>
                <Label>Variables</Label>
                <pre className="p-2 bg-muted rounded text-sm">
                  {JSON.stringify(selectedTemplate.variables, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={isTestSendOpen} onOpenChange={setIsTestSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email using the template: {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test_email">Test Email Address</Label>
              <Input
                id="test_email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address for testing"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTestSendOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleTestSend} disabled={!testEmail}>
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplateManager;