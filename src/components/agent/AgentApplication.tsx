
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgentApplicationProps {
  onSubmit?: () => Promise<void>;
}

const AgentApplication: React.FC<AgentApplicationProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    location: '',
    expectedCustomers: '',
    reason: '',
    experience: '',
    businessPlan: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.location || !formData.expectedCustomers || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('agent_applications')
        .insert({
          user_id: user.id,
          location: formData.location,
          expected_customers: parseInt(formData.expectedCustomers),
          reason: formData.reason,
          experience: formData.experience || null,
          business_plan: formData.businessPlan || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Application submitted successfully');
      
      // Reset form
      setFormData({
        location: '',
        expectedCustomers: '',
        reason: '',
        experience: '',
        businessPlan: ''
      });

      // Call onSubmit callback if provided
      if (onSubmit) {
        await onSubmit();
      }
    } catch (error: any) {
      console.error('Application submission error:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Application</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Enter your location"
              required
            />
          </div>

          <div>
            <Label htmlFor="expectedCustomers">Expected Customers per Month *</Label>
            <Input
              id="expectedCustomers"
              type="number"
              min="1"
              value={formData.expectedCustomers}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedCustomers: e.target.value }))}
              placeholder="Enter expected number of customers"
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Why do you want to become an agent? *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Explain your motivation"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="experience">Previous Experience (Optional)</Label>
            <Textarea
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
              placeholder="Describe any relevant experience"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="businessPlan">Business Plan (Optional)</Label>
            <Textarea
              id="businessPlan"
              value={formData.businessPlan}
              onChange={(e) => setFormData(prev => ({ ...prev, businessPlan: e.target.value }))}
              placeholder="Outline your business approach"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgentApplication;
