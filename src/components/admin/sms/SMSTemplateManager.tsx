import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Eye,
  Copy,
  AlertCircle
} from 'lucide-react';

interface SMSTemplate {
  id: string;
  template_name: string;
  template_category: string;
  purpose: string;
  message_template: string;
  variables: string[];
  is_active: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

const SMSTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    template_name: '',
    template_category: 'otp',
    purpose: '',
    message_template: '',
    variables: [] as string[],
    is_active: true,
    language: 'en'
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to handle JSON variables field
      const transformedTemplates = (data || []).map(template => ({
        ...template,
        variables: Array.isArray(template.variables) 
          ? template.variables 
          : typeof template.variables === 'string' 
            ? JSON.parse(template.variables) 
            : []
      }));
      
      setTemplates(transformedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load SMS templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.template_name || !formData.message_template || !formData.purpose) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const templateData = {
        ...formData,
        variables: JSON.stringify(formData.variables)
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('sms_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('sms_templates')
          .insert([templateData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_category: template.template_category,
      purpose: template.purpose,
      message_template: template.message_template,
      variables: template.variables || [],
      is_active: template.is_active,
      language: template.language
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      template_category: 'otp',
      purpose: '',
      message_template: '',
      variables: [],
      is_active: true,
      language: 'en'
    });
  };

  const extractVariables = (template: string): string[] => {
    const matches = template.match(/{([^}]+)}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const handleTemplateChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      message_template: value,
      variables: extractVariables(value)
    }));
  };

  const previewTemplate = (template: string, variables: string[]): string => {
    let preview = template;
    variables.forEach(variable => {
      const value = previewData[variable] || `{${variable}}`;
      preview = preview.replace(new RegExp(`{${variable}}`, 'g'), value);
    });
    return preview;
  };

  const duplicateTemplate = async (template: SMSTemplate) => {
    setFormData({
      template_name: `${template.template_name}_copy`,
      template_category: template.template_category,
      purpose: `${template.purpose}_copy`,
      message_template: template.message_template,
      variables: template.variables || [],
      is_active: false,
      language: template.language
    });
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SMS Templates</h2>
          <p className="text-muted-foreground">
            Manage SMS message templates for different purposes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingTemplate(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <DialogDescription>
                Create reusable SMS templates with dynamic variables
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template_name">Template Name *</Label>
                  <Input
                    id="template_name"
                    value={formData.template_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                    placeholder="e.g., otp_verification"
                  />
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Input
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="e.g., verification"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.template_category} onValueChange={(value) => setFormData(prev => ({ ...prev, template_category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="otp">OTP</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                      <SelectItem value="lg">Luganda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="message_template">Message Template *</Label>
                <Textarea
                  id="message_template"
                  value={formData.message_template}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  placeholder="Use {variable_name} for dynamic content"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use curly braces to define variables: {"{otp}, {amount}, {expiry_minutes}"}
                </p>
              </div>

              {formData.variables.length > 0 && (
                <div>
                  <Label>Variables Found</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.variables.map((variable, index) => (
                      <Badge key={index} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading templates...</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first SMS template to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.template_name}
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        {template.template_category}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Purpose: {template.purpose} | Language: {template.language}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateTemplate(template)}
                      title="Duplicate template"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Template</h4>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      {template.message_template}
                    </div>
                  </div>
                  
                  {template.variables && template.variables.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Variables</h4>
                      <div className="flex flex-wrap gap-2">
                        {template.variables.map((variable, index) => (
                          <Badge key={index} variant="outline">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SMSTemplateManager;