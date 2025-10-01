
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContactPerson {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

interface EmergencyContactsSectionProps {
  contactPersons: ContactPerson[];
  onContactsUpdate: () => void;
  canEdit: boolean;
}

const EmergencyContactsSection: React.FC<EmergencyContactsSectionProps> = ({
  contactPersons,
  onContactsUpdate,
  canEdit
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);

  const relationships = [
    'parent', 'spouse', 'sibling', 'child', 'guardian', 
    'friend', 'colleague', 'partner', 'director', 'other'
  ];

  const resetForm = () => {
    setFormData({ name: '', relationship: '', phone: '', email: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.relationship || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Saving contact to contact_persons table for user:', user.id);

      // Ensure relationship value matches database enum
      const relationshipValue = formData.relationship as "parent" | "guardian" | "sibling" | "friend" | "director" | "other" | "spouse" | "child" | "partner" | "colleague";

      if (editingId) {
        // Update existing contact in contact_persons table
        const { error } = await supabase
          .from('contact_persons')
          .update({
            name: formData.name,
            relationship: relationshipValue,
            phone: formData.phone,
            email: formData.email || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        console.log('Successfully updated contact in contact_persons table');
        toast.success('Emergency contact updated successfully');
      } else {
        // Create new contact in contact_persons table
        const { error } = await supabase
          .from('contact_persons')
          .insert({
            user_id: user.id,
            name: formData.name,
            relationship: relationshipValue,
            phone: formData.phone,
            email: formData.email || null
          });

        if (error) throw error;
        console.log('Successfully created contact in contact_persons table');
        toast.success('Emergency contact added successfully');
      }

      resetForm();
      onContactsUpdate();
    } catch (error: any) {
      console.error('Error saving contact to contact_persons table:', error);
      toast.error(error.message || 'Failed to save emergency contact');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contact: ContactPerson) => {
    if (!canEdit) return;
    
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || ''
    });
    setEditingId(contact.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    
    try {
      setLoading(true);
      console.log('Deleting contact from contact_persons table:', id);
      
      const { error } = await supabase
        .from('contact_persons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log('Successfully deleted contact from contact_persons table');
      toast.success('Emergency contact deleted successfully');
      onContactsUpdate();
    } catch (error: any) {
      console.error('Error deleting contact from contact_persons table:', error);
      toast.error('Failed to delete emergency contact');
    } finally {
      setLoading(false);
    }
  };

  const formatRelationship = (relationship: string) => {
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
  };

  return (
    <div className="space-y-4">
      {/* Existing contacts */}
      <div className="space-y-3">
        {contactPersons.map((contact) => (
          <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{contact.name}</h4>
                <Badge variant="secondary">
                  {formatRelationship(contact.relationship)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Phone: {contact.phone}
                {contact.email && ` • Email: ${contact.email}`}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(contact)}
                  disabled={loading}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(contact.id)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {canEdit && (
        <>
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Emergency Contact
            </Button>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
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
                            {formatRelationship(rel)}
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
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : editingId ? 'Update Contact' : 'Add Contact'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {contactPersons.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No emergency contacts added yet.</p>
          {canEdit && (
            <p className="text-sm mt-1">Add at least one emergency contact for verification.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmergencyContactsSection;
