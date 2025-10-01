
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';

const ProfileImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'full_name',
      'email', 
      'phone',
      'account_type',
      'nationality',
      'country_of_residence',
      'town_city',
      'date_of_birth',
      'gender',
      'tin',
      'referrer_code',
      'referral_code'
    ];
    
    const csvContent = headers.join(',') + '\n' + 
      'John Doe,john@example.com,256700000000,individual,Uganda,Uganda,Kampala,1990-01-01,male,123456789,,';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profile_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Generate batch ID for this import
      const batchId = crypto.randomUUID();
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length || !values[0]) continue;
        
        const profile: any = {};
        headers.forEach((header, index) => {
          profile[header] = values[index];
        });

        // Validate that at least one contact method (email or phone) is provided
        if (!profile.email && !profile.phone) {
          console.warn(`Row ${i + 1}: Skipping profile - no email or phone provided`);
          errorCount++;
          continue;
        }

        // Generate ID for the profile
        const profileId = crypto.randomUUID();

        // Handle referrer lookup if referrer_code is provided
        let referredBy = null;
        if (profile.referrer_code && profile.referrer_code.trim()) {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', profile.referrer_code.trim())
            .single();
          
          if (referrer) {
            referredBy = referrer.id;
          } else {
            console.warn(`Row ${i + 1}: Referrer code '${profile.referrer_code}' not found`);
          }
        }

        // Map CSV data to profile format
        const profileData: any = {
          id: profileId,
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          account_type: profile.account_type || 'individual',
          nationality: profile.nationality || '',
          country_of_residence: profile.country_of_residence || '',
          town_city: profile.town_city || '',
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender || '',
          tin: profile.tin || '',
          status: 'unverified' as const,
          user_role: 'user',
          account_activation_status: 'pending',
          import_batch_id: batchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Add optional referral fields only if provided
        if (referredBy) {
          profileData.referred_by = referredBy;
        }
        
        if (profile.referral_code && profile.referral_code.trim()) {
          profileData.referral_code = profile.referral_code.trim();
        }

        try {
          // Insert profile
          const { error } = await supabase
            .from('profiles')
            .insert(profileData);

          if (error) {
            console.error('Error importing profile:', error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Profile import error:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} profiles${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      } else {
        toast.error('No profiles were imported');
      }
      
      setFile(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import profiles');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import User Profiles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>CSV Template</Label>
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>
        
        <div>
          <Label htmlFor="csvFile">CSV File</Label>
          <Input
            id="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>
        
        <Button 
          onClick={handleImport} 
          disabled={!file || importing}
          className="w-full flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importing...' : 'Import Profiles'}
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Profiles require at least one contact method (email or phone). Optional columns: referrer_code (existing user's referral code who referred this person), referral_code (pre-assign a specific code, otherwise auto-generated on activation). Imported users will need to activate their accounts.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProfileImporter;
