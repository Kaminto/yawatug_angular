import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';

interface VotingOption {
  text: string;
  order: number;
}

interface ProposalFormData {
  title: string;
  description: string;
  proposal_type: string;
  start_date: string;
  end_date: string;
  minimum_shares_required: number;
  quorum_percentage: number;
  voting_options: VotingOption[];
}

interface ProposalCreationFormProps {
  onProposalCreated: () => void;
}

const ProposalCreationForm: React.FC<ProposalCreationFormProps> = ({ onProposalCreated }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    proposal_type: 'dividend',
    start_date: '',
    end_date: '',
    minimum_shares_required: 1,
    quorum_percentage: 25,
    voting_options: [
      { text: 'Yes', order: 1 },
      { text: 'No', order: 2 }
    ]
  });

  const handleInputChange = (field: keyof ProposalFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.voting_options];
    newOptions[index].text = value;
    setFormData(prev => ({
      ...prev,
      voting_options: newOptions
    }));
  };

  const addVotingOption = () => {
    setFormData(prev => ({
      ...prev,
      voting_options: [
        ...prev.voting_options,
        { text: '', order: prev.voting_options.length + 1 }
      ]
    }));
  };

  const removeVotingOption = (index: number) => {
    if (formData.voting_options.length <= 2) {
      toast.error('Minimum 2 voting options required');
      return;
    }
    
    const newOptions = formData.voting_options.filter((_, i) => i !== index);
    newOptions.forEach((option, i) => {
      option.order = i + 1;
    });
    
    setFormData(prev => ({
      ...prev,
      voting_options: newOptions
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Authentication required');
      return;
    }

    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    if (formData.voting_options.some(option => !option.text.trim())) {
      toast.error('All voting options must have text');
      return;
    }

    setLoading(true);

    try {
      // Create proposal
      const { data: proposalData, error: proposalError } = await supabase
        .from('voting_proposals')
        .insert({
          title: formData.title,
          description: formData.description,
          proposal_type: formData.proposal_type,
          status: 'draft',
          start_date: formData.start_date,
          end_date: formData.end_date,
          minimum_shares_required: formData.minimum_shares_required,
          quorum_percentage: formData.quorum_percentage,
          created_by: user.id
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Create voting options
      const optionsToInsert = formData.voting_options.map(option => ({
        proposal_id: proposalData.id,
        option_text: option.text,
        option_order: option.order
      }));

      const { error: optionsError } = await supabase
        .from('voting_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      toast.success('Proposal created successfully');
      onProposalCreated();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        proposal_type: 'dividend',
        start_date: '',
        end_date: '',
        minimum_shares_required: 1,
        quorum_percentage: 25,
        voting_options: [
          { text: 'Yes', order: 1 },
          { text: 'No', order: 2 }
        ]
      });

    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Proposal</CardTitle>
        <CardDescription>
          Create a new voting proposal for shareholders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Proposal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter proposal title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the proposal"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="proposal_type">Proposal Type</Label>
                <Select value={formData.proposal_type} onValueChange={(value) => handleInputChange('proposal_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dividend">Dividend Distribution</SelectItem>
                    <SelectItem value="investment">Investment Decision</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                    <SelectItem value="strategic">Strategic Decision</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="minimum_shares_required">Min. Shares Required</Label>
                <Input
                  id="minimum_shares_required"
                  type="number"
                  value={formData.minimum_shares_required}
                  onChange={(e) => handleInputChange('minimum_shares_required', parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="quorum_percentage">Quorum %</Label>
                <Input
                  id="quorum_percentage"
                  type="number"
                  value={formData.quorum_percentage}
                  onChange={(e) => handleInputChange('quorum_percentage', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Voting Options</Label>
              <div className="space-y-2 mt-2">
                {formData.voting_options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    <Badge variant="outline">#{option.order}</Badge>
                    {formData.voting_options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeVotingOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addVotingOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Voting Option
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Proposal'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProposalCreationForm;