
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickAddContactButtonProps {
  onContactAdded: () => void;
}

const QuickAddContactButton: React.FC<QuickAddContactButtonProps> = ({ onContactAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: ''
  });

  const relationships = [
    'parent', 'spouse', 'sibling', 'child', 'guardian', 
    'friend', 'colleague', 'other'
  ];

  const resetForm = () => {
    setFormData({ name: '', relationship: '', phone: '', email: '' });
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

      console.log('Quick adding contact to contact_persons table for user:', user.id);

      // Ensure relationship value matches database enum
      const relationshipValue = formData.relationship as "parent" | "guardian" | "sibling" | "friend" | "director" | "other";

      // Insert new contact into contact_persons table
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
      
      console.log('Successfully added contact to contact_persons table');
      toast.success('Emergency contact added successfully');
      resetForm();
      setIsOpen(false);
      onContactAdded();
    } catch (error: any) {
      console.error('Error adding contact to contact_persons table:', error);
      toast.error(error.message || 'Failed to add emergency contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Contact
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="quick-name">Full Name *</Label>
              <Input
                id="quick-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="quick-relationship">Relationship *</Label>
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
              <Label htmlFor="quick-phone">Phone Number *</Label>
              <Input
                id="quick-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div>
              <Label htmlFor="quick-email">Email (Optional)</Label>
              <Input
                id="quick-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Adding...' : 'Add Contact'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickAddContactButton;
