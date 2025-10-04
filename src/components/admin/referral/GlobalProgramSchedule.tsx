import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProgramSchedule {
  id: string;
  name: string;
  description: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  commission_rate: number;
}

const GlobalProgramSchedule = () => {
  const [schedule, setSchedule] = useState<ProgramSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Yawatu Referral Program',
    description: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
    commission_rate: 5
  });

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_programs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSchedule(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          valid_from: data.valid_from?.split('T')[0] || '',
          valid_until: data.valid_until?.split('T')[0] || '',
          is_active: data.is_active,
          commission_rate: (typeof data.commission_rate === 'string' ? parseFloat(data.commission_rate) : data.commission_rate) * 100
        });
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast.error('Failed to load program schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Deactivate all existing programs
      await supabase
        .from('referral_programs')
        .update({ is_active: false })
        .eq('is_active', true);

      // Create or update the program
      const programData = {
        name: formData.name,
        description: formData.description,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active,
        commission_rate: formData.commission_rate / 100,
        currency: 'UGX'
      };

      if (schedule?.id) {
        // Update existing
        const { error } = await supabase
          .from('referral_programs')
          .update(programData)
          .eq('id', schedule.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('referral_programs')
          .insert([programData]);

        if (error) throw error;
      }

      toast.success('Program schedule updated successfully');
      loadSchedule();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save program schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Global Referral Program Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This sets the global schedule for the referral program. All users will be eligible for commissions 
            only during the specified time period, regardless of when they registered.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="E.g., Yawatu Referral Program 2025"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Program details and terms"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Start Date</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">End Date (Optional)</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no end date
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_rate">Commission Rate (%)</Label>
            <Input
              id="commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Program is Active</Label>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {schedule ? 'Last updated: ' + new Date(schedule.valid_from).toLocaleDateString() : 'No active program'}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Program Schedule'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GlobalProgramSchedule;
