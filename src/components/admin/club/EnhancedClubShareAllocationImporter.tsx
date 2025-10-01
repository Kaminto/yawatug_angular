import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertTriangle, CheckCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ClubAllocationImportData } from '@/interfaces/ClubShareInterfaces';

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ProcessedImportData extends ClubAllocationImportData {
  row: number;
  hasAccount: boolean;
  validation_status: 'valid' | 'invalid' | 'warning';
  errors: string[];
}

interface EnhancedClubShareAllocationImporterProps {
  onImportComplete: () => void;
}

const EnhancedClubShareAllocationImporter: React.FC<EnhancedClubShareAllocationImporterProps> = ({ 
  onImportComplete 
}) => {
  const [importData, setImportData] = useState<ProcessedImportData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [batchReference, setBatchReference] = useState('');
  const [preview, setPreview] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csv = e.target?.result as string;
      await parseAndValidateCSV(csv);
    };
    reader.readAsText(file);
  };

  const parseAndValidateCSV = async (csv: string) => {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('CSV file must contain headers and at least one data row');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['member_name', 'email', 'phone', 'allocated_shares', 'transfer_fee_paid', 'debt_amount_settled', 'total_cost', 'cost_per_share'];
    
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      toast.error(`Missing required headers: ${missingHeaders.join(', ')}`);
      return;
    }

    const errors: ValidationError[] = [];
    const data: ProcessedImportData[] = [];

    // Check which users already have accounts
    const emails = lines.slice(1)
      .map(line => line.split(',')[headers.indexOf('email')]?.trim())
      .filter(email => email);
    
    const phones = lines.slice(1)
      .map(line => line.split(',')[headers.indexOf('phone')]?.trim())
      .filter(phone => phone);

    const existingEmailsSet = new Set<string>();
    const existingPhonesSet = new Set<string>();
    try {
      if (emails.length > 0) {
        const { data: emailProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('email', emails);
        emailProfiles?.forEach((p: any) => p.email && existingEmailsSet.add(p.email));
      }
      if (phones.length > 0) {
        const { data: phoneProfiles } = await supabase
          .from('profiles')
          .select('phone')
          .in('phone', phones);
        phoneProfiles?.forEach((p: any) => p.phone && existingPhonesSet.add(p.phone));
      }
    } catch (e) {
      console.warn('Profile existence check failed', e);
    }

    const existingEmails = existingEmailsSet;
    const existingPhones = existingPhonesSet;

    for (let i = 1; i < lines.length; i++) {
      const row = i + 1;
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push({
          row,
          field: 'structure',
          message: `Row has ${values.length} columns, expected ${headers.length}`
        });
        continue;
      }

      const rowData: ProcessedImportData = {
        member_name: values[headers.indexOf('member_name')] || '',
        email: values[headers.indexOf('email')] || '',
        phone: values[headers.indexOf('phone')] || '',
        allocated_shares: parseInt(values[headers.indexOf('allocated_shares')]) || 0,
        transfer_fee_paid: parseFloat(values[headers.indexOf('transfer_fee_paid')]) || 0,
        debt_amount_settled: parseFloat(values[headers.indexOf('debt_amount_settled')]) || 0,
        total_cost: parseFloat(values[headers.indexOf('total_cost')]) || 0,
        cost_per_share: parseFloat(values[headers.indexOf('cost_per_share')]) || 0,
        debt_rejected: parseFloat(values[headers.indexOf('debt_rejected')]) || 0,
        batch_reference: values[headers.indexOf('batch_reference')] || '',
        row,
        hasAccount: existingEmails.has(values[headers.indexOf('email')]) || existingPhones.has(values[headers.indexOf('phone')]),
        validation_status: 'valid',
        errors: []
      };

      // Validate data
      const rowErrors: string[] = [];

      if (!rowData.member_name) {
        rowErrors.push('Member name is required');
      }

      if (!rowData.email || !/\S+@\S+\.\S+/.test(rowData.email)) {
        rowErrors.push('Valid email is required');
      }

      if (!rowData.phone) {
        rowErrors.push('Phone number is required');
      }

      if (rowData.allocated_shares <= 0) {
        rowErrors.push('Allocated shares must be greater than 0');
      }

      if (rowData.debt_amount_settled < 0) {
        rowErrors.push('Debt amount cannot be negative');
      }

      if (rowErrors.length > 0) {
        rowData.validation_status = 'invalid';
        rowData.errors = rowErrors;
        errors.push(...rowErrors.map(error => ({
          row,
          field: 'validation',
          message: error
        })));
      } else if (!rowData.hasAccount) {
        rowData.validation_status = 'warning';
        rowData.errors = ['User account will be created'];
      }

      data.push(rowData);
    }

    setImportData(data);
    setValidationErrors(errors);
    setPreview(true);
    
    // Generate batch reference if not provided
    if (!batchReference) {
      setBatchReference(`BATCH-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
    }
  };

  const processImport = async () => {
    if (importData.length === 0) {
      toast.error('No data to import');
      return;
    }

    const validData = importData.filter(item => item.validation_status !== 'invalid');
    if (validData.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    setProcessing(true);
    try {
      let successCount = 0;
      let profilesCreated = 0;

      for (const item of validData) {
        try {
          let clubMemberId: string;

          if (!item.hasAccount) {
            // Create profile first - let DB trigger generate referral code
            const profileId = crypto.randomUUID();
            const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: profileId,
                email: item.email,
                full_name: item.member_name,
                phone: item.phone,
                account_activation_status: 'pending'
                // Note: referral_code will be auto-generated by DB trigger
              })
              .select('id')
              .single();

            if (profileError) throw profileError;
            profilesCreated++;

            // Generate invitation token
            const { data: invitationToken, error: tokenError } = await supabase
              .rpc('generate_invitation_token', {
                p_user_id: newProfile.id
              });

            if (tokenError) throw tokenError;

            // Send activation email with consent link
            await supabase.functions.invoke('unified-communication-sender', {
              body: {
                recipient: item.email,
                subject: 'Activate Your Yawatu Account',
                message: `Welcome to Yawatu! You have been invited to join.`,
                channel: 'email',
                templateType: 'account_activation',
                templateData: {
                  name: item.member_name,
                  phone: item.phone,
                  invitation_token: invitationToken,
                  activationUrl: `${window.location.origin}/activate-account?token=${encodeURIComponent(invitationToken)}`
                }
              }
            });
          }

          // Create or find club member
          const { data: existingMember } = await supabase
            .from('investment_club_members')
            .select('id')
            .eq('email', item.email)
            .single();

          if (existingMember) {
            clubMemberId = existingMember.id;
          } else {
            const { data: newMember, error: memberError } = await supabase
              .from('investment_club_members')
              .insert({
                member_name: item.member_name,
                email: item.email,
                phone: item.phone,
                member_code: `CM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
              })
              .select('id')
              .single();

            if (memberError) throw memberError;
            clubMemberId = newMember.id;
          }

          // Create allocation
          const { error: allocationError } = await supabase
            .from('club_share_allocations')
            .insert({
              club_member_id: clubMemberId,
              allocated_shares: item.allocated_shares,
              transfer_fee_paid: item.transfer_fee_paid,
              debt_amount_settled: item.debt_amount_settled,
              total_cost: item.total_cost,
              cost_per_share: item.cost_per_share,
              debt_rejected: item.debt_rejected,
              import_batch_reference: batchReference,
              allocation_status: 'pending_invitation'
            });

          if (allocationError) throw allocationError;

          successCount++;
        } catch (error) {
          console.error(`Error processing row ${item.row}:`, error);
        }
      }

      toast.success(
        `Import completed: ${successCount} allocations created, ${profilesCreated} new profiles created`
      );
      
      clearPreview();
      onImportComplete();

    } catch (error) {
      console.error('Import processing error:', error);
      toast.error('Failed to process import');
    } finally {
      setProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'member_name',
      'email', 
      'phone',
      'allocated_shares',
      'transfer_fee_paid',
      'debt_amount_settled',
      'total_cost',
      'cost_per_share',
      'debt_rejected',
      'batch_reference'
    ];
    
    const sampleData = [
      'John Doe,john@example.com,+256701234567,1000,50000,500000,1000000,1000,25000,BATCH-001',
      'Jane Smith,jane@example.com,+256702345678,500,25000,250000,500000,1000,10000,BATCH-001'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enhanced_club_allocation_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearPreview = () => {
    setImportData([]);
    setValidationErrors([]);
    setPreview(false);
    setBatchReference('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <UserPlus className="h-4 w-4 text-orange-600" />;
      case 'invalid':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Enhanced Club Share Allocation Importer
        </CardTitle>
        <CardDescription>
          Import member data with automatic profile creation and consent notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="file-upload">Upload CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Enhanced Features:</strong>
                <ul className="list-disc ml-4 mt-2">
                  <li>Automatically creates user profiles for members without accounts</li>
                  <li>Sends activation emails with consent links to new members</li>
                  <li>Links existing members to their allocations</li>
                  <li>Validates all data before processing</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Import Preview</h3>
                <p className="text-sm text-muted-foreground">
                  {importData.length} records found, {importData.filter(d => d.validation_status === 'valid').length} valid
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearPreview}>
                  Cancel
                </Button>
                <Button 
                  onClick={processImport}
                  disabled={processing || importData.filter(d => d.validation_status !== 'invalid').length === 0}
                >
                  {processing ? 'Processing...' : 'Process Import'}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="batch-reference">Batch Reference</Label>
              <Input
                id="batch-reference"
                value={batchReference}
                onChange={(e) => setBatchReference(e.target.value)}
                placeholder="Enter batch reference"
              />
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{validationErrors.length} validation errors found:</strong>
                  <ul className="list-disc ml-4 mt-2">
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>Row {error.row}: {error.message}</li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>... and {validationErrors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Has Account</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.validation_status)}
                          <Badge variant={
                            item.validation_status === 'valid' ? 'default' :
                            item.validation_status === 'warning' ? 'secondary' : 'destructive'
                          }>
                            {item.validation_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{item.member_name}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.allocated_shares.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={item.hasAccount ? 'default' : 'outline'}>
                          {item.hasAccount ? 'Yes' : 'Will Create'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.errors.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {item.errors.join(', ')}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedClubShareAllocationImporter;