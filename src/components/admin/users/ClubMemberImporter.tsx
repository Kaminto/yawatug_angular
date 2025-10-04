import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { normalizePhoneNumber } from '@/lib/utils';

interface ClubMemberData {
  name: string;
  email: string;
  phone: string;
  receipts: number;
  payments: number;
  net_balance: number;
  category: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

const ClubMemberImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ClubMemberData[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [duplicates, setDuplicates] = useState<ClubMemberData[]>([]);
  const [successfulImports, setSuccessfulImports] = useState<ClubMemberData[]>([]);
  const [updatedRecords, setUpdatedRecords] = useState<ClubMemberData[]>([]);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [updateExisting, setUpdateExisting] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      'Name',
      'Email', 
      'Phone',
      'Receipts',
      'Payments',
      'Net balance',
      'D-cat'
    ];
    
    const csvContent = headers.join(',') + '\n' + 
      'ABALA ASIKU GEORGE,asikugeorge1@gmail.com,0782317987,1160296,1041790,118506,DB\n' +
      'Abbedi Aliria Samuel,abbedialiriasamuel@gmail.com,0782838615,1500000,970000,530000,DB';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'club_members_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const normalizePhone = (phoneRaw: any): string => {
    if (!phoneRaw) return '';
    const raw = String(phoneRaw).trim();

    // Do NOT attempt to reconstruct scientific notation – it loses digits from Excel.
    // If we detect it, treat as invalid so the user can correct the CSV (format column as Text).
    if (/[eE]\+?\d+/.test(raw)) {
      return '';
    }

    // Use shared normalizer from utils to handle +256/256/0 formats and stripping spaces/dashes
    return normalizePhoneNumber(raw);
  };

  const validateRow = (row: any, index: number): ImportError[] => {
    const errors: ImportError[] = [];
    
    if (!row.name || row.name.trim() === '') {
      errors.push({ row: index + 1, field: 'name', message: 'Name is required' });
    }
    
    if (!row.email || !validateEmail(row.email)) {
      errors.push({ row: index + 1, field: 'email', message: 'Valid email is required' });
    }
    
    if (!row.phone || row.phone.trim() === '') {
      errors.push({ row: index + 1, field: 'phone', message: 'Phone is required' });
    } else {
      // Check for scientific notation (Excel conversion issue)
      const phoneStr = String(row.phone).trim();
      if (/[eE]\+?\d+/.test(phoneStr)) {
        errors.push({ 
          row: index + 1, 
          field: 'phone', 
          message: `Phone in scientific notation (Excel error). Format phone column as Text before export: ${phoneStr}` 
        });
      } else {
        const normalized = normalizePhone(row.phone);
        if (!normalized || normalized.length !== 10 || !normalized.startsWith('0')) {
          errors.push({ 
            row: index + 1, 
            field: 'phone', 
            message: `Invalid phone format. Expected: +256XXXXXXXXX or 0XXXXXXXXX. Got: ${row.phone}` 
          });
        }
      }
    }
    
    const receipts = parseFloat(row.receipts || '0');
    const payments = parseFloat(row.payments || '0');
    
    if (isNaN(receipts) || receipts < 0) {
      errors.push({ row: index + 1, field: 'receipts', message: 'Valid receipts amount required' });
    }
    
    if (isNaN(payments) || payments < 0) {
      errors.push({ row: index + 1, field: 'payments', message: 'Valid payments amount required' });
    }
    
    return errors;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    
    if (!selectedFile || selectedFile.type !== 'text/csv') {
      toast.error('Please select a valid CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    await parseAndPreview(selectedFile);
  };

  const parseAndPreview = async (file: File) => {
    try {
      const text = await file.text();
      
      // Proper CSV parsing function that handles quoted fields
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const lines = text.split('\n').filter(line => line.trim());
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      
      // Validate headers with precise mapping
      const headerMap: Record<string, string> = {};
      
      // More precise header matching
      headerMap['name'] = headers.find(h => h.toLowerCase().includes('name')) || headers[0];
      headerMap['email'] = headers.find(h => h.toLowerCase().includes('email')) || headers[1];
      headerMap['phone'] = headers.find(h => h.toLowerCase().includes('phone')) || headers[2];
      headerMap['receipts'] = headers.find(h => h.toLowerCase().includes('receipt')) || headers[3];
      headerMap['payments'] = headers.find(h => h.toLowerCase().includes('payment')) || headers[4];
      headerMap['net balance'] = headers.find(h => h.toLowerCase().includes('net') || h.toLowerCase().includes('balance')) || headers[5];
      headerMap['d-cat'] = headers.find(h => h.toLowerCase().includes('cat') || h.toLowerCase().includes('d-cat')) || headers[6];
      
      console.log('Header mapping:', headerMap);
      console.log('CSV headers:', headers);

      const validData: ClubMemberData[] = [];
      const duplicatesData: ClubMemberData[] = [];
      const validationErrors: ImportError[] = [];
      const emailSet = new Set<string>();

      // First pass: check for existing users in database
      const allEmails = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= headers.length && values[0]) {
          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });
          const email = (rowData[headerMap['email']] || rowData.email || '').toLowerCase();
          if (email) allEmails.push(email);
        }
      }

      // Check for existing users in database (in smaller batches to avoid PostgreSQL limit)
      const emailBatchSize = 500; // Reduced batch size for better reliability
      const existingUsers = [];
      
      for (let i = 0; i < allEmails.length; i += emailBatchSize) {
        const emailBatch = allEmails.slice(i, i + emailBatchSize);
        const { data: batchUsers, error: batchError } = await supabase
          .from('profiles')
          .select('email')
          .in('email', emailBatch);
        
        if (batchError) {
          console.error('Error checking existing users:', batchError);
          continue;
        }
        
        if (batchUsers) {
          existingUsers.push(...batchUsers);
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const existingEmails = new Set(existingUsers?.map(u => u.email) || []);

      // Second pass: categorize data
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length || !values[0]) continue;

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        console.log(`Row ${i} data:`, rowData);
        console.log(`Mapped values:`, {
          name: rowData[headerMap['name']],
          email: rowData[headerMap['email']],
          phone: rowData[headerMap['phone']],
          receipts: rowData[headerMap['receipts']],
          payments: rowData[headerMap['payments']],
          netBalance: rowData[headerMap['net balance']],
          category: rowData[headerMap['d-cat']]
        });

        // Map to standard format with better numeric parsing
        const receiptsValue = rowData[headerMap['receipts']] || rowData.receipts || '0';
        const paymentsValue = rowData[headerMap['payments']] || rowData.payments || '0';
        const netBalanceValue = rowData[headerMap['net balance']] || rowData['net balance'] || '0';
        
        const memberData: ClubMemberData = {
          name: rowData[headerMap['name']] || rowData.name || '',
          email: (rowData[headerMap['email']] || rowData.email || '').toLowerCase(),
          phone: normalizePhone(rowData[headerMap['phone']] || rowData.phone || ''),
          receipts: parseFloat(String(receiptsValue).replace(/[,\s]/g, '')) || 0,
          payments: parseFloat(String(paymentsValue).replace(/[,\s]/g, '')) || 0,
          net_balance: parseFloat(String(netBalanceValue).replace(/[,\s]/g, '')) || 0,
          category: rowData[headerMap['d-cat']] || rowData['d-cat'] || 'DB'
        };

        // Validate row
        const rowErrors = validateRow(memberData, i - 1);
        
        // Check for duplicates (existing in DB or within CSV)
        const isDuplicate = existingEmails.has(memberData.email) || emailSet.has(memberData.email);
        
        if (isDuplicate) {
          duplicatesData.push(memberData);
          if (existingEmails.has(memberData.email)) {
            validationErrors.push({ 
              row: i, 
              field: 'email', 
              message: `User already exists in database: ${memberData.email}` 
            });
          } else {
            validationErrors.push({ 
              row: i, 
              field: 'email', 
              message: `Duplicate email in CSV: ${memberData.email}` 
            });
          }
        } else {
          // Only add to valid data if no validation errors
          if (rowErrors.length === 0) {
            validData.push(memberData);
            emailSet.add(memberData.email);
          } else {
            validationErrors.push(...rowErrors);
          }
        }
      }

      setPreviewData(validData);
      setDuplicates(duplicatesData);
      setErrors(validationErrors);
      setShowPreview(true);

      toast.success(`Preview ready: ${validData.length} valid, ${duplicatesData.length} duplicates, ${validationErrors.filter(e => !e.message.includes('Duplicate') && !e.message.includes('already exists')).length} errors`);

    } catch (error) {
      console.error('CSV parsing error:', error);
      toast.error('Failed to parse CSV file');
    }
  };

  const generateCSVReport = (data: ClubMemberData[], filename: string) => {
    const headers = ['Name', 'Email', 'Phone', 'Receipts', 'Payments', 'Net Balance', 'Category'];
    const csvContent = [
      headers.join(','),
      ...data.map(member => [
        `"${member.name}"`,
        member.email,
        member.phone,
        member.receipts,
        member.payments,
        member.net_balance,
        member.category
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadDuplicatesReport = () => {
    generateCSVReport(duplicates, `club_members_duplicates_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadSuccessReport = () => {
    generateCSVReport(successfulImports, `club_members_imported_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImport = async () => {
    const totalToProcess = previewData.length + (updateExisting ? duplicates.length : 0);
    
    if (totalToProcess === 0) {
      toast.error('No data to import or update');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const importedMembers: ClubMemberData[] = [];
    const updatedMembers: ClubMemberData[] = [];
    
    try {
      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;

      // First handle updates if enabled
      if (updateExisting && duplicates.length > 0) {
        console.log(`Starting update of ${duplicates.length} existing members`);
        
        for (let i = 0; i < duplicates.length; i++) {
          const member = duplicates[i];
          
          try {
            // First, check if phone number differs and update profile if needed
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, phone')
              .eq('email', member.email)
              .single();

            if (existingProfile && existingProfile.phone !== member.phone) {
              console.log(`Updating phone for ${member.email}: ${existingProfile.phone} -> ${member.phone}`);
              
              const { error: phoneUpdateError } = await supabase
                .from('profiles')
                .update({ 
                  phone: member.phone,
                  updated_at: new Date().toISOString()
                })
                .eq('email', member.email);

              if (phoneUpdateError) {
                console.error('Phone update error for:', member.email, phoneUpdateError);
              }
            }

            // Update the financial data in investment_club_members
            const { error: updateError } = await supabase
              .from('investment_club_members')
              .update({
                phone: member.phone, // Also update phone here
                total_deposits: member.receipts,
                total_withdrawals: member.payments,
                net_balance: member.net_balance,
                member_type: member.category,
                updated_at: new Date().toISOString()
              })
              .eq('email', member.email);

            if (updateError) {
              console.error('Update error for:', member.email, updateError);
              errorCount++;
            } else {
              updateCount++;
              updatedMembers.push(member);
            }
          } catch (error) {
            console.error('Update error:', error);
            errorCount++;
          }
          
          // Update progress
          const progress = Math.round(((i + 1) / totalToProcess) * 100);
          setImportProgress(progress);
          
          // Small delay between updates
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Then handle new imports
      if (previewData.length > 0) {
        console.log(`Starting import of ${previewData.length} new members`);
        
        const batchSize = 25; // Smaller batches for more reliable processing
        const batchId = `club_import_${Date.now()}`;

        // Process in batches
        for (let batchStart = 0; batchStart < previewData.length; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize, previewData.length);
          const batch = previewData.slice(batchStart, batchEnd);
          
          // Prepare batch data with UUIDs
          const profilesData = batch.map(member => ({
            id: crypto.randomUUID(),
            full_name: member.name,
            email: member.email,
            phone: member.phone,
            status: 'unverified' as const,
            account_activation_status: 'pending' as const,
            import_batch_id: batchId
          }));

          const clubMembersData = profilesData.map((profile, index) => ({
            user_id: profile.id,
            member_name: profile.full_name,
            member_code: `CM${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            email: profile.email,
            phone: profile.phone,
            total_deposits: batch[index].receipts,
            total_withdrawals: batch[index].payments,
            net_balance: batch[index].net_balance,
            member_type: batch[index].category,
            status: 'active' as const,
            join_date: new Date().toISOString()
          }));

          try {
            // Insert profiles in batch
            const { error: profileError } = await supabase
              .from('profiles')
              .insert(profilesData);

            if (profileError) {
              console.error('Batch profile creation error:', profileError);
              errorCount += batch.length;
              continue;
            }

            // Insert club members in batch
            const { error: memberError } = await supabase
              .from('investment_club_members')
              .insert(clubMembersData);

            if (memberError) {
              console.error('Batch club member creation error:', memberError);
              errorCount += batch.length;
              continue;
            }

            // Track successful imports
            successCount += batch.length;
            importedMembers.push(...batch);

          } catch (error) {
            console.error('Batch import error:', error);
            errorCount += batch.length;
          }
          
          // Update progress for new imports
          const newImportProgress = duplicates.length + batchEnd;
          const progress = Math.round((newImportProgress / totalToProcess) * 100);
          setImportProgress(progress);
          console.log(`Completed import batch - Progress: ${progress}%`);
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Update state with results
      setSuccessfulImports(importedMembers);
      setUpdatedRecords(updatedMembers);
      setImportCompleted(true);

      console.log(`Import/Update completed: ${successCount} imported, ${updateCount} updated, ${errorCount} failed`);
      
      if (successCount > 0 || updateCount > 0) {
        let message = '';
        if (successCount > 0) message += `${successCount} imported`;
        if (updateCount > 0) message += `${message ? ', ' : ''}${updateCount} updated`;
        if (errorCount > 0) message += ` (${errorCount} errors)`;
        
        toast.success(`Successfully completed: ${message}`, {
          duration: 5000
        });
      } else {
        toast.error('No records were processed. Please check the logs for errors.');
      }

    } catch (error) {
      console.error('Import/Update error:', error);
      toast.error('Failed to process records');
    } finally {
      setImporting(false);
    }
  };

  const downloadUpdatedReport = () => {
    generateCSVReport(updatedRecords, `club_members_updated_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const resetImporter = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setDuplicates([]);
    setSuccessfulImports([]);
    setUpdatedRecords([]);
    setShowPreview(false);
    setImportCompleted(false);
    setImportProgress(0);
    setUpdateExisting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Investment Club Members</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={showPreview ? "preview" : "upload"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload CSV</TabsTrigger>
            <TabsTrigger value="preview" disabled={!showPreview}>Preview & Import</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
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
              <Label htmlFor="csvFile">Club Members CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground mt-2">
                CSV should contain: Name, Email, Phone, Receipts, Payments, Net balance, D-cat
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {/* Update Existing Option */}
            {duplicates.length > 0 && (
              <div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Checkbox 
                  id="updateExisting"
                  checked={updateExisting}
                  onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                />
                <label 
                  htmlFor="updateExisting" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Update financial data for existing users ({duplicates.length} found)
                </label>
              </div>
            )}

            {/* Duplicates Section */}
            {duplicates.length > 0 && !updateExisting && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-warning">Duplicates Found ({duplicates.length})</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadDuplicatesReport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Duplicates Report
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  These members already exist in the database. Enable "Update existing" to update their financial data:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {duplicates.slice(0, 5).map((member, index) => (
                    <p key={index} className="text-sm">
                      {member.name} ({member.email}) - Receipts: {member.receipts.toLocaleString()}, Payments: {member.payments.toLocaleString()}, Net: {member.net_balance.toLocaleString()}
                    </p>
                  ))}
                  {duplicates.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      ... and {duplicates.length - 5} more duplicates
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Update Preview */}
            {duplicates.length > 0 && updateExisting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-700 mb-2">Records to Update ({duplicates.length})</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Financial data will be updated for these existing users:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {duplicates.slice(0, 5).map((member, index) => (
                    <p key={index} className="text-sm">
                      {member.name} ({member.email}) - New: Receipts: {member.receipts.toLocaleString()}, Payments: {member.payments.toLocaleString()}, Net: {member.net_balance.toLocaleString()}
                    </p>
                  ))}
                  {duplicates.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      ... and {duplicates.length - 5} more updates
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {errors.filter(e => !e.message.includes('Duplicate') && !e.message.includes('already exists')).length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-semibold text-destructive mb-2">
                  Validation Errors ({errors.filter(e => !e.message.includes('Duplicate') && !e.message.includes('already exists')).length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {errors.filter(e => !e.message.includes('Duplicate') && !e.message.includes('already exists')).slice(0, 10).map((error, index) => (
                    <p key={index} className="text-sm text-destructive">
                      Row {error.row}, {error.field}: {error.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Valid Members Preview */}
            {previewData.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-success">Valid Members to Import ({previewData.length})</h4>
                <div className="max-h-64 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Receipts</th>
                        <th className="text-left p-2">Payments</th>
                        <th className="text-left p-2">Net Balance</th>
                        <th className="text-left p-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((member, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{member.name}</td>
                          <td className="p-2">{member.email}</td>
                          <td className="p-2">{member.phone}</td>
                          <td className="p-2">{member.receipts.toLocaleString()}</td>
                          <td className="p-2">{member.payments.toLocaleString()}</td>
                          <td className="p-2">{member.net_balance.toLocaleString()}</td>
                          <td className="p-2">{member.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 5 && (
                    <p className="text-sm text-muted-foreground p-2">
                      ... and {previewData.length - 5} more members
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Import Success Report */}
            {importCompleted && successfulImports.length > 0 && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-success">Import Completed Successfully!</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadSuccessReport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Success Report
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {successfulImports.length} members were successfully imported and added to the investment club.
                </p>
              </div>
            )}
            {/* Updated Records Report */}
            {importCompleted && updatedRecords.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-blue-700">Update Completed Successfully!</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadUpdatedReport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Updated Report
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {updatedRecords.length} members had their financial data updated successfully.
                </p>
              </div>
            )}

            {/* Import Progress */}
            {importing && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Processing Club Members...</h4>
                  <span className="text-sm text-muted-foreground">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {updateExisting && duplicates.length > 0 ? 
                    `Updating ${duplicates.length} existing members and importing ${previewData.length} new members` :
                    `Processing member ${Math.ceil((importProgress / 100) * previewData.length)} of ${previewData.length}`
                  }
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!importCompleted ? (
                <Button 
                  onClick={handleImport} 
                  disabled={!previewData.length || importing}
                  className="flex-1 flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {importing ? 'Importing Club Members...' : `Import ${previewData.length} Valid Members`}
                </Button>
              ) : (
                <Button 
                  onClick={resetImporter} 
                  variant="outline"
                  className="flex-1"
                >
                  Import More Members
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <p className="text-sm text-muted-foreground mt-4">
          This will create user profiles AND add them to the investment club. 
          Members can activate their accounts and update profiles after first login.
        </p>
      </CardContent>
    </Card>
  );
};

export default ClubMemberImporter;