
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload, Eye } from 'lucide-react';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParsedProfile {
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  nationality: string;
  country_of_residence: string;
  town_city: string;
  date_of_birth: string;
  gender: string;
  tin: string;
  referrer_code: string;
  referral_code: string;
  rowNumber: number;
}

interface CategorizedProfile {
  profile: ParsedProfile;
  category: 'new' | 'phone_update' | 'rejected';
  reason?: string;
  existingData?: {
    email?: string;
    phone?: string;
  };
}

const ProfileImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [categorized, setCategorized] = useState<CategorizedProfile[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      await parsePreview(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const parsePreview = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const categorizedProfiles: CategorizedProfile[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length || !values[0]) continue;
        
        const profile: any = {};
        headers.forEach((header, index) => {
          profile[header] = values[index];
        });

        const normalizedPhone = normalizePhoneNumber(profile.phone);
        
        const parsedProfile: ParsedProfile = {
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: normalizedPhone || '',
          account_type: profile.account_type || 'individual',
          nationality: profile.nationality || '',
          country_of_residence: profile.country_of_residence || '',
          town_city: profile.town_city || '',
          date_of_birth: profile.date_of_birth || '',
          gender: profile.gender || '',
          tin: profile.tin || '',
          referrer_code: profile.referrer_code || '',
          referral_code: profile.referral_code || '',
          rowNumber: i + 1
        };

        // Validate contact info
        if (!parsedProfile.email && !normalizedPhone) {
          categorizedProfiles.push({
            profile: parsedProfile,
            category: 'rejected',
            reason: 'No email or phone provided'
          });
          continue;
        }

        // Check if profile exists
        let existingProfile = null;
        if (parsedProfile.email) {
          const { data } = await supabase
            .from('profiles')
            .select('id, email, phone')
            .eq('email', parsedProfile.email)
            .maybeSingle();
          existingProfile = data;
        }
        
        if (!existingProfile && normalizedPhone) {
          const { data } = await supabase
            .from('profiles')
            .select('id, email, phone')
            .eq('phone', normalizedPhone)
            .maybeSingle();
          existingProfile = data;
        }

        if (existingProfile) {
          // Check if phone will be updated
          const phoneWillUpdate = normalizedPhone && normalizedPhone !== existingProfile.phone;
          
          if (phoneWillUpdate) {
            categorizedProfiles.push({
              profile: parsedProfile,
              category: 'phone_update',
              existingData: {
                email: existingProfile.email,
                phone: existingProfile.phone
              }
            });
          } else {
            // Profile exists but no significant changes
            categorizedProfiles.push({
              profile: parsedProfile,
              category: 'rejected',
              reason: 'Profile exists with same phone number'
            });
          }
        } else {
          // New profile
          categorizedProfiles.push({
            profile: parsedProfile,
            category: 'new'
          });
        }
      }
      
      setCategorized(categorizedProfiles);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview file');
    }
  };

  const downloadRejected = () => {
    const rejected = categorized.filter(c => c.category === 'rejected');
    
    if (rejected.length === 0) {
      toast.info('No rejected profiles to download');
      return;
    }

    const headers = ['row_number', 'full_name', 'email', 'phone', 'rejection_reason'];
    const rows = rejected.map(r => [
      r.profile.rowNumber,
      r.profile.full_name,
      r.profile.email,
      r.profile.phone,
      r.reason || 'Unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rejected_profiles_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${rejected.length} rejected profiles`);
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
      let updatedCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length || !values[0]) continue;
        
        const profile: any = {};
        headers.forEach((header, index) => {
          profile[header] = values[index];
        });

        // Normalize phone number
        const normalizedPhone = normalizePhoneNumber(profile.phone);

        // Validate that at least one contact method (email or phone) is provided
        if (!profile.email && !normalizedPhone) {
          console.warn(`Row ${i + 1}: Skipping profile - no email or phone provided`);
          errorCount++;
          continue;
        }

        // Check if profile exists by email or phone
        let existingProfile = null;
        if (profile.email) {
          const { data } = await supabase
            .from('profiles')
            .select('id, phone')
            .eq('email', profile.email)
            .maybeSingle();
          existingProfile = data;
        }
        
        if (!existingProfile && normalizedPhone) {
          const { data } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('phone', normalizedPhone)
            .maybeSingle();
          existingProfile = data;
        }

        // Handle referrer lookup if referrer_code is provided
        let referredBy = null;
        if (profile.referrer_code && profile.referrer_code.trim()) {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', profile.referrer_code.trim())
            .maybeSingle();
          
          if (referrer) {
            referredBy = referrer.id;
          } else {
            console.warn(`Row ${i + 1}: Referrer code '${profile.referrer_code}' not found`);
          }
        }

        const profileData: any = {
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: normalizedPhone || '',
          account_type: profile.account_type || 'individual',
          nationality: profile.nationality || '',
          country_of_residence: profile.country_of_residence || '',
          town_city: profile.town_city || '',
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender || '',
          tin: profile.tin || '',
          updated_at: new Date().toISOString()
        };

        if (referredBy) {
          profileData.referred_by = referredBy;
        }
        
        if (profile.referral_code && profile.referral_code.trim()) {
          profileData.referral_code = profile.referral_code.trim();
        }

        try {
          if (existingProfile) {
            // Update existing profile with new phone/email if provided
            const updateData: any = { ...profileData };
            
            // Only update phone if it's provided in CSV and different from existing
            if (normalizedPhone && normalizedPhone !== existingProfile.phone) {
              updateData.phone = normalizedPhone;
            }
            
            // Only update email if it's provided in CSV and different from existing
            if (profile.email && profile.email !== existingProfile.email) {
              updateData.email = profile.email;
            }

            const { error } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', existingProfile.id);

            if (error) {
              console.error('Error updating profile:', error);
              errorCount++;
            } else {
              updatedCount++;
            }
          } else {
            // Insert new profile
            const insertData = {
              ...profileData,
              id: crypto.randomUUID(),
              status: 'unverified' as const,
              user_role: 'user',
              account_activation_status: 'pending',
              import_batch_id: batchId,
              created_at: new Date().toISOString()
            };

            const { error } = await supabase
              .from('profiles')
              .insert(insertData);

            if (error) {
              console.error('Error importing profile:', error);
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (error) {
          console.error('Profile import/update error:', error);
          errorCount++;
        }
      }

      const message = [];
      if (successCount > 0) message.push(`${successCount} imported`);
      if (updatedCount > 0) message.push(`${updatedCount} updated`);
      if (errorCount > 0) message.push(`${errorCount} failed`);

      if (successCount > 0 || updatedCount > 0) {
        toast.success(`Successfully ${message.join(', ')}`);
      } else {
        toast.error('No profiles were imported or updated');
      }
      
      setFile(null);
      setCategorized([]);
      setShowPreview(false);
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

        {showPreview && categorized.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Import Preview</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  New: {categorized.filter(c => c.category === 'new').length} | 
                  Phone Updates: {categorized.filter(c => c.category === 'phone_update').length} | 
                  Rejected: {categorized.filter(c => c.category === 'rejected').length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadRejected}
                  disabled={categorized.filter(c => c.category === 'rejected').length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Rejected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  Hide Preview
                </Button>
              </div>
            </div>

            {/* New Imports */}
            {categorized.filter(c => c.category === 'new').length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-green-600">New Imports ({categorized.filter(c => c.category === 'new').length})</Label>
                <ScrollArea className="h-[200px] rounded-md border border-green-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorized.filter(c => c.category === 'new').map((item, idx) => (
                        <TableRow key={idx} className="bg-green-50/50">
                          <TableCell className="text-muted-foreground">{item.profile.rowNumber}</TableCell>
                          <TableCell className="font-medium">{item.profile.full_name}</TableCell>
                          <TableCell>{item.profile.email || '-'}</TableCell>
                          <TableCell>{formatPhoneNumber(item.profile.phone) || '-'}</TableCell>
                          <TableCell>{item.profile.account_type}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Phone Updates */}
            {categorized.filter(c => c.category === 'phone_update').length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-blue-600">Phone Number Updates ({categorized.filter(c => c.category === 'phone_update').length})</Label>
                <ScrollArea className="h-[200px] rounded-md border border-blue-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Old Phone</TableHead>
                        <TableHead>New Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorized.filter(c => c.category === 'phone_update').map((item, idx) => (
                        <TableRow key={idx} className="bg-blue-50/50">
                          <TableCell className="text-muted-foreground">{item.profile.rowNumber}</TableCell>
                          <TableCell className="font-medium">{item.profile.full_name}</TableCell>
                          <TableCell>{item.existingData?.email || '-'}</TableCell>
                          <TableCell className="text-muted-foreground line-through">
                            {formatPhoneNumber(item.existingData?.phone) || '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {formatPhoneNumber(item.profile.phone)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Rejected */}
            {categorized.filter(c => c.category === 'rejected').length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-red-600">Rejected ({categorized.filter(c => c.category === 'rejected').length})</Label>
                <ScrollArea className="h-[200px] rounded-md border border-red-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorized.filter(c => c.category === 'rejected').map((item, idx) => (
                        <TableRow key={idx} className="bg-red-50/50">
                          <TableCell className="text-muted-foreground">{item.profile.rowNumber}</TableCell>
                          <TableCell className="font-medium">{item.profile.full_name}</TableCell>
                          <TableCell>{item.profile.email || '-'}</TableCell>
                          <TableCell>{formatPhoneNumber(item.profile.phone) || '-'}</TableCell>
                          <TableCell className="text-red-600 text-sm">{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
        
        <Button 
          onClick={handleImport} 
          disabled={!file || importing}
          className="w-full flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importing...' : 'Import Profiles'}
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Profiles require at least one contact method (email or phone). If a profile with matching email or phone exists, it will be updated with new information including phone numbers. Optional columns: referrer_code, referral_code.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProfileImporter;
