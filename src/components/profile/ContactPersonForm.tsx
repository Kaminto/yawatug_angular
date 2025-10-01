
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContactPerson {
  id: string;
  name: string;
  relationship: 'parent' | 'spouse' | 'sibling' | 'child' | 'guardian' | 'friend' | 'colleague' | 'other';
  phone: string;
  email?: string;
}

interface ContactPersonFormProps {
  userId: string;
}

const ContactPersonForm: React.FC<ContactPersonFormProps> = ({ userId }) => {
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: ''
  });

  const relationships = [
    'parent', 'spouse', 'sibling', 'child', 'guardian', 
    'friend', 'colleague', 'other'
  ] as const;

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_persons')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      // Map the database relationship enum to our interface
      const mappedData = (data || []).map(contact => ({
        ...contact,
        relationship: contact.relationship as ContactPerson['relationship']
      }));
      
      setContacts(mappedData);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadContacts();
    }
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.relationship || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingId) {
        // Update existing contact
        const { error } = await supabase
          .from('contact_persons')
          .update({
            name: formData.name,
            relationship: formData.relationship as any,
            phone: formData.phone,
            email: formData.email || null
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Emergency contact updated successfully');
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contact_persons')
          .insert({
            user_id: userId,
            name: formData.name,
            relationship: formData.relationship as any,
            phone: formData.phone,
            email: formData.email || null
          });

        if (error) throw error;
        toast.success('Emergency contact added successfully');
      }

      setFormData({ name: '', relationship: '', phone: '', email: '' });
      setEditingId(null);
      await loadContacts();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast.error(error.message || 'Failed to save emergency contact');
    }
  };

  const handleEdit = (contact: ContactPerson) => {
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || ''
    });
    setEditingId(contact.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_persons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Emergency contact deleted successfully');
      await loadContacts();
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete emergency contact');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', relationship: '', phone: '', email: '' });
    setEditingId(null);
  };

  if (loading) {
    return <div>Loading emergency contacts...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="relationship">Relationship *</Label>
                <Select 
                  value={formData.relationship} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationships.map((rel) => (
                      <SelectItem key={rel} value={rel}>
                        {rel.charAt(0).toUpperCase() + rel.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Update Contact' : 'Add Contact'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{contact.name}</h3>
                      <Badge variant="secondary">
                        {contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Phone: {contact.phone}
                      {contact.email && ` • Email: ${contact.email}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContactPersonForm;
