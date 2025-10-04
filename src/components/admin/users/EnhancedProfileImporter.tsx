
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload, AlertCircle, CheckCircle, Eye, FileText, Users, RefreshCw } from 'lucide-react';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils';

interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface PreviewData {
  full_name: string;
  email: string;
  phone: string;
  user_type: string;
  nationality: string;
  country_of_residence: string;
  town_city: string;
  date_of_birth: string;
  gender: string;
  tin: string;
  account_type: string;
  rowNumber?: number;
  category?: 'new' | 'phone_update' | 'rejected';
  existingPhone?: string;
  existingProfileId?: string;
}

interface ImportStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  duplicates: number;
}

interface ImportReport {
  imported: PreviewData[];
  rejected: { data: PreviewData; errors: ImportError[] }[];
}

interface ImportResult {
  stats: ImportStats;
  report: ImportReport;
}

const EnhancedProfileImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, processed: 0, successful: 0, failed: 0, duplicates: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    console.log('Email validation:', email, '→', isValid);
    return isValid;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  };

  const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    const raw = String(phone).trim();

    // Do NOT attempt to reconstruct scientific notation – it loses digits from Excel.
    // If we detect it, treat as invalid so the user can correct the CSV (format column as Text).
    if (/[eE]\+?\d+/.test(raw)) {
      return '';
    }

    // Use shared normalizer to handle +256/256/0 formats and stripping spaces/dashes
    return normalizePhoneNumber(raw);
  };

  const validatePhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    if (!normalized) return false; // Reject empty or scientific notation
    const phoneRegex = /^0\d{9}$/; // Uganda phone format: 0 followed by 9 digits
    return phoneRegex.test(normalized);
  };

  const validateDate = (date: string): boolean => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate < new Date();
  };

  const validateRow = (row: any, index: number): ImportError[] => {
    const rowErrors: ImportError[] = [];
    console.log(`=== Validating Row ${index + 2} ===`, row);

    // Check full_name
    if (!row.full_name?.trim()) {
      console.log('❌ Missing full_name');
      rowErrors.push({ row: index + 2, field: 'full_name', message: 'Full name is required' });
    } else {
      console.log('✅ Full name valid:', row.full_name);
    }

    // Check that at least one contact method (email or phone) is provided
    const hasEmail = row.email?.trim();
    const hasPhone = row.phone?.trim();
    
    if (!hasEmail && !hasPhone) {
      console.log('❌ No contact method provided');
      rowErrors.push({ row: index + 2, field: 'contact', message: 'Either email or phone (or both) is required' });
    }

    // Check email format if provided
    if (hasEmail) {
      if (!validateEmail(row.email)) {
        console.log('❌ Invalid email format:', row.email);
        rowErrors.push({ row: index + 2, field: 'email', message: 'Invalid email format', value: row.email });
      } else {
        console.log('✅ Email valid:', row.email);
      }
    } else {
      console.log('ℹ️ No email provided (optional)');
    }

    // Check phone format if provided
    if (hasPhone) {
      const originalPhone = row.phone;
      
      // Check for scientific notation first (Excel conversion issue)
      if (/[eE]\+?\d+/.test(String(originalPhone))) {
        console.log('❌ Phone in scientific notation:', originalPhone);
        rowErrors.push({ 
          row: index + 2, 
          field: 'phone', 
          message: `Phone in scientific notation (Excel error). Format phone column as Text before export: ${originalPhone}`, 
          value: originalPhone 
        });
      } else {
        const normalizedPhone = normalizePhone(originalPhone);
        const phoneRegex = /^0\d{9}$/;
        const isValid = phoneRegex.test(normalizedPhone);
        
        console.log('📞 Phone validation details:');
        console.log('  Original:', originalPhone);
        console.log('  Normalized:', normalizedPhone);
        console.log('  Regex test:', isValid);
        console.log('  Length:', normalizedPhone.length);
        
        if (!isValid) {
          console.log('❌ Phone validation failed');
          rowErrors.push({ 
            row: index + 2, 
            field: 'phone', 
            message: `Invalid phone format. Expected: +256XXXXXXXXX or 0XXXXXXXXX. Got: ${originalPhone}`, 
            value: originalPhone 
          });
        } else {
          console.log('✅ Phone valid');
        }
      }
    } else {
      console.log('ℹ️ No phone provided (optional)');
    }

    // Check date_of_birth
    if (row.date_of_birth && !validateDate(row.date_of_birth)) {
      console.log('❌ Invalid date:', row.date_of_birth);
      rowErrors.push({ row: index + 2, field: 'date_of_birth', message: 'Invalid date format', value: row.date_of_birth });
    } else if (row.date_of_birth) {
      console.log('✅ Date valid:', row.date_of_birth);
    }

    // Check user_type/account_type
    const validUserTypes = ['individual', 'business', 'organisation', 'minor'];
    const accountType = row.account_type || row.user_type;
    if (accountType && !validUserTypes.includes(accountType)) {
      console.log('❌ Invalid account_type:', accountType);
      rowErrors.push({ row: index + 2, field: 'account_type', message: 'Invalid account type', value: accountType });
    } else if (accountType) {
      console.log('✅ Account type valid:', accountType);
    }

    // Check gender
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (row.gender && !validGenders.includes(row.gender)) {
      console.log('❌ Invalid gender:', row.gender);
      rowErrors.push({ row: index + 2, field: 'gender', message: 'Invalid gender', value: row.gender });
    } else if (row.gender) {
      console.log('✅ Gender valid:', row.gender);
    }

    console.log(`Row ${index + 2} validation complete. Errors:`, rowErrors.length);
    return rowErrors;
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
      'address'
    ];
    
    const csvContent = headers.join(',') + '\n' + 
      'John Doe,john@example.com,+256700000000,individual,Uganda,Uganda,Kampala,1990-01-01,male,123456789,123 Main Street\n' +
      'Jane Smith,jane@example.com,,individual,Uganda,Uganda,Entebbe,1985-05-15,female,987654321,456 Oak Avenue\n' +
      'Bob Johnson,,+256702000000,individual,Uganda,Uganda,Jinja,1992-03-10,male,555666777,789 Pine Road';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enhanced_profile_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.includes('csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    await parseAndPreview(selectedFile);
  };

  const parseAndPreview = async (file: File) => {
    setParsing(true);
    setErrors([]);
    setPreviewData([]);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must contain at least a header row and one data row');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const requiredHeaders = ['full_name'];
      const contactHeaders = ['email', 'phone'];
      
      const missingRequired = requiredHeaders.filter(h => !headers.includes(h));
      const hasContactMethod = contactHeaders.some(h => headers.includes(h));
      
      if (missingRequired.length > 0) {
        toast.error(`Missing required headers: ${missingRequired.join(', ')}`);
        return;
      }
      
      if (!hasContactMethod) {
        toast.error('CSV must contain at least one contact method: email or phone');
        return;
      }

      const parsedData: PreviewData[] = [];
      const allErrors: ImportError[] = [];

      // Check for existing profiles by email and phone
      const emails = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const emailIndex = headers.indexOf('email');
        return emailIndex >= 0 ? values[emailIndex] : '';
      }).filter(Boolean);

      const phones = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const phoneIndex = headers.indexOf('phone');
        return phoneIndex >= 0 ? normalizePhone(values[phoneIndex]) : '';
      }).filter(Boolean);

      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, email, phone')
        .or(`email.in.(${emails.join(',')}),phone.in.(${phones.join(',')})`);

      const existingByEmail = new Map(existingProfiles?.map(p => [p.email, p]) || []);
      const existingByPhone = new Map(existingProfiles?.map(p => [p.phone, p]) || []);
      const duplicateEmails = new Set<string>();
      const seenEmails = new Set<string>();
      const seenPhones = new Set<string>();
      const duplicatePhones = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) {
          console.log(`⚠️ Row ${i + 1} has insufficient columns:`, values.length, 'vs', headers.length);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        console.log(`Processing row ${i + 1}:`, rowData);

        const normalizedPhone = rowData.phone ? normalizePhone(rowData.phone) : '';
        let category: 'new' | 'phone_update' | 'rejected' = 'new';
        let existingProfile = null;
        let existingPhone = '';

        // Check for duplicate emails within the file
        if (seenEmails.has(rowData.email)) {
          duplicateEmails.add(rowData.email);
          allErrors.push({ 
            row: i + 1, 
            field: 'email', 
            message: 'Duplicate email in file', 
            value: rowData.email 
          });
          category = 'rejected';
        } else {
          seenEmails.add(rowData.email);
        }

        // Check for duplicate phones within the file
        if (normalizedPhone && seenPhones.has(normalizedPhone)) {
          duplicatePhones.add(normalizedPhone);
          allErrors.push({ 
            row: i + 1, 
            field: 'phone', 
            message: 'Duplicate phone number in file', 
            value: normalizedPhone 
          });
          category = 'rejected';
        } else if (normalizedPhone) {
          seenPhones.add(normalizedPhone);
        }

        // Check for existing profile by email or phone
        if (rowData.email && existingByEmail.has(rowData.email)) {
          existingProfile = existingByEmail.get(rowData.email)!;
          existingPhone = existingProfile.phone || '';
          
          // Check if phone will be updated
          if (normalizedPhone && normalizedPhone !== existingPhone) {
            category = 'phone_update';
          } else {
            category = 'rejected';
            allErrors.push({ 
              row: i + 1, 
              field: 'email', 
              message: 'Profile exists with same data', 
              value: rowData.email 
            });
          }
        } else if (normalizedPhone && existingByPhone.has(normalizedPhone)) {
          existingProfile = existingByPhone.get(normalizedPhone)!;
          existingPhone = existingProfile.phone || '';
          category = 'rejected';
          allErrors.push({ 
            row: i + 1, 
            field: 'phone', 
            message: 'Phone already exists in database', 
            value: normalizedPhone 
          });
        }

        const rowErrors = validateRow(rowData, i - 1);
        allErrors.push(...rowErrors);

        if (rowErrors.length > 0 && category !== 'rejected') {
          category = 'rejected';
        }

        parsedData.push({
          full_name: rowData.full_name || '',
          email: rowData.email || '',
          phone: normalizedPhone || '',
          user_type: rowData.user_type || 'individual',
          nationality: rowData.nationality || '',
          country_of_residence: rowData.country_of_residence || '',
          town_city: rowData.town_city || '',
          date_of_birth: rowData.date_of_birth || '',
          gender: rowData.gender || '',
          tin: rowData.tin || '',
          account_type: rowData.account_type || rowData.user_type || 'individual',
          rowNumber: i + 1,
          category,
          existingPhone,
          existingProfileId: existingProfile?.id
        });
      }

      setPreviewData(parsedData);
      setErrors(allErrors);
      setStats({
        total: parsedData.length,
        processed: 0,
        successful: 0,
        failed: allErrors.length,
        duplicates: duplicateEmails.size
      });
      setShowPreview(true);
      
      if (allErrors.length === 0) {
        toast.success(`Preview ready: ${parsedData.length} profiles parsed successfully`);
      } else {
        toast.warning(`Preview ready with ${allErrors.length} validation errors`);
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) {
      toast.error('Please select and preview a CSV file first');
      return;
    }

    // SIMPLIFIED APPROACH: Import all records, let database handle validation
    setImporting(true);
    setImportProgress(0);
    
    // Generate batch ID for this import
    const batchId = crypto.randomUUID();
    
    const importStats: ImportStats = {
      total: previewData.length,
      processed: 0,
      successful: 0,
      failed: 0,
      duplicates: 0
    };

    const importedRecords: PreviewData[] = [];
    const rejectedRecords: { data: PreviewData; errors: ImportError[] }[] = [];

    // Generate starting referral code for this batch
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('referral_code')
      .order('created_at', { ascending: false })
      .limit(1);
    
    const lastCode = existingProfile?.[0]?.referral_code || 'YWT00000';
    const startingNumber = parseInt(lastCode.substring(3)) || 0;

    try {
      // Process ALL records - let database handle validation
      for (let i = 0; i < previewData.length; i++) {
        const profile = previewData[i];
        
        // Skip rejected profiles
        if (profile.category === 'rejected') {
          rejectedRecords.push({ 
            data: profile, 
            errors: [{ row: profile.rowNumber || i + 2, field: 'validation', message: 'Failed validation' }] 
          });
          importStats.failed++;
          importStats.processed++;
          continue;
        }

        // Handle phone updates
        if (profile.category === 'phone_update' && profile.existingProfileId) {
          try {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                phone: profile.phone,
                updated_at: new Date().toISOString()
              })
              .eq('id', profile.existingProfileId);

            if (updateError) {
              console.error('Phone update error:', updateError);
              rejectedRecords.push({ 
                data: profile, 
                errors: [{ row: profile.rowNumber || i + 2, field: 'update', message: `Update failed: ${updateError.message}` }] 
              });
              importStats.failed++;
            } else {
              console.log('Phone updated successfully for:', profile.email);
              importStats.successful++;
              importedRecords.push(profile);
            }
          } catch (error) {
            console.error('Phone update error:', error);
            rejectedRecords.push({ 
              data: profile, 
              errors: [{ row: profile.rowNumber || i + 2, field: 'update', message: 'Failed to update phone' }] 
            });
            importStats.failed++;
          }
          
          importStats.processed++;
          setImportProgress((importStats.processed / previewData.length) * 100);
          setStats({ ...importStats });
          continue;
        }
        
        // Create new profiles (category === 'new')
        const hasEmail = profile.email?.trim();
        const hasPhone = profile.phone?.trim();
        
        if (!profile.full_name?.trim() || (!hasEmail && !hasPhone)) {
          rejectedRecords.push({ 
            data: profile, 
            errors: [{ row: profile.rowNumber || i + 2, field: 'required', message: 'Missing name or contact method (email/phone)' }] 
          });
          importStats.failed++;
          importStats.processed++;
          continue;
        }
        
        try {
          // Generate ID for the profile
          const profileId = crypto.randomUUID();

          // Generate unique referral code for this profile
          const newReferralCode = `YWT${(startingNumber + i + 1).toString().padStart(5, '0')}`;

          // Create simplified profile data - minimal required fields
          const profileData = {
            id: profileId,
            full_name: profile.full_name.trim(),
            email: profile.email?.trim() ? profile.email.trim().toLowerCase() : null,
            phone: profile.phone ? normalizePhone(profile.phone) : null,
            user_type: 'individual' as any, // Default to individual
            account_type: profile.account_type || 'individual',
            nationality: profile.nationality || null,
            country_of_residence: profile.country_of_residence || null,
            town_city: profile.town_city || null,
            date_of_birth: profile.date_of_birth || null,
            gender: profile.gender || null,
            tin: profile.tin || null,
            status: 'unverified' as const,
            user_role: 'user',
            referral_code: newReferralCode,
            account_activation_status: 'pending',
            import_batch_id: batchId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Attempting to insert profile:', profileData);

          // Insert profile with better error handling
          const { error: profileError } = await supabase
            .from('profiles')
            .insert(profileData);

          if (profileError) {
            console.error('Profile insert error:', profileError);
            rejectedRecords.push({ 
              data: profile, 
              errors: [{ row: i + 2, field: 'database', message: `Database error: ${profileError.message}` }] 
            });
            importStats.failed++;
          } else {
            console.log('Profile inserted successfully for:', profile.email);
            importStats.successful++;
            importedRecords.push(profile);
            
            // Try to create default wallets (don't fail import if this fails)
            try {
              await supabase
                .from('wallets')
                .insert([
                  { user_id: profileId, currency: 'USD', balance: 0, status: 'active' },
                  { user_id: profileId, currency: 'UGX', balance: 0, status: 'active' }
                ]);
              console.log('Wallets created for:', profile.email);
            } catch (walletError) {
              console.warn('Wallet creation failed for:', profile.email, walletError);
            }
          }
        } catch (error) {
          console.error('Profile import error:', error);
          rejectedRecords.push({ 
            data: profile, 
            errors: [{ row: i + 2, field: 'system', message: 'Failed to import record' }] 
          });
          importStats.failed++;
        }

        importStats.processed++;
        setImportProgress((importStats.processed / previewData.length) * 100);
        setStats({ ...importStats });

        // Add small delay to prevent overwhelming the database
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Create import result
      const result: ImportResult = {
        stats: importStats,
        report: {
          imported: importedRecords,
          rejected: rejectedRecords
        }
      };
      
      setImportResult(result);

      if (importStats.successful > 0) {
        toast.success(`Successfully imported ${importStats.successful} profiles${importStats.failed > 0 ? ` (${importStats.failed} failed)` : ''}`);
      } else {
        toast.error('No profiles were imported');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import profiles');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const downloadReport = (type: 'imported' | 'rejected') => {
    if (!importResult) return;

    const headers = [
      'full_name',
      'email', 
      'phone',
      'user_type',
      'account_type',
      'nationality',
      'country_of_residence',
      'town_city',
      'date_of_birth',
      'gender',
      'tin'
    ];

    let csvContent = '';
    let filename = '';

    if (type === 'imported') {
      filename = `imported_profiles_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = headers.join(',') + '\n';
      
      importResult.report.imported.forEach(record => {
        const row = [
          record.full_name,
          record.email,
          record.phone,
          record.user_type,
          record.account_type,
          record.nationality,
          record.country_of_residence,
          record.town_city,
          record.date_of_birth,
          record.gender,
          record.tin
        ].map(field => `"${field || ''}"`);
        csvContent += row.join(',') + '\n';
      });
    } else {
      filename = `rejected_profiles_${new Date().toISOString().split('T')[0]}.csv`;
      const errorHeaders = [...headers, 'error_details'];
      csvContent = errorHeaders.join(',') + '\n';
      
      importResult.report.rejected.forEach(record => {
        const errorDetails = record.errors.map(e => `${e.field}: ${e.message}`).join('; ');
        const row = [
          record.data.full_name,
          record.data.email,
          record.data.phone,
          record.data.user_type,
          record.data.account_type,
          record.data.nationality,
          record.data.country_of_residence,
          record.data.town_city,
          record.data.date_of_birth,
          record.data.gender,
          record.data.tin,
          errorDetails
        ].map(field => `"${field || ''}"`);
        csvContent += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Enhanced Profile Importer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={!showPreview}>Preview</TabsTrigger>
            <TabsTrigger value="errors" disabled={errors.length === 0}>
              Errors ({errors.length})
            </TabsTrigger>
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
                Download Enhanced Template
              </Button>
            </div>
            
            <div>
              <Label htmlFor="csvFile">CSV File (Max 5MB)</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={parsing || importing}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Profiles require a full name and at least one contact method (email or phone). Both can be provided or just one.
              </p>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Excel Users:</strong> Format the phone column as TEXT before entering numbers. 
                Otherwise Excel converts large numbers to scientific notation (e.g., 2.56E+11) which corrupts the data.
                Right-click column → Format Cells → Text, then enter phone numbers with leading zeros (e.g., 0785123456).
              </AlertDescription>
            </Alert>

            {parsing && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Parsing CSV file and validating data...
                </AlertDescription>
              </Alert>
            )}

            {showPreview && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {previewData.filter(p => p.category === 'new').length}
                    </div>
                    <div className="text-sm text-muted-foreground">New Imports</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {previewData.filter(p => p.category === 'phone_update').length}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Phone Updates
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{errors.length}</div>
                    <div className="text-sm text-muted-foreground">Rejected</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{stats.duplicates}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing profiles...</span>
                  <span>{stats.processed}/{stats.total}</span>
                </div>
                <Progress value={importProgress} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Successful: {stats.successful}</span>
                  <span>Failed: {stats.failed}</span>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleImport} 
              disabled={!showPreview || importing || previewData.filter(p => p.category !== 'rejected').length === 0}
              className="w-full flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importing...' : `Import Profiles (${previewData.filter(p => p.category !== 'rejected').length} valid)`}
            </Button>

            {importResult && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <div className="font-medium text-green-800">Import Complete</div>
                    <div className="text-sm text-green-600">
                      {importResult.stats.successful} imported, {importResult.stats.failed} rejected
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadReport('imported')}
                      disabled={importResult.stats.successful === 0}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Imported ({importResult.stats.successful})
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadReport('rejected')}
                      disabled={importResult.stats.failed === 0}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Rejected ({importResult.stats.failed})
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Imported users will be created with default wallets and can reset their passwords using the built-in password reset process.
            </p>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {/* New Imports */}
            {previewData.filter(p => p.category === 'new').length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-green-50 p-4 border-b border-green-200">
                  <h3 className="font-semibold flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    New Imports ({previewData.filter(p => p.category === 'new').length})
                  </h3>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Row</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.filter(p => p.category === 'new').map((row, index) => (
                        <tr key={index} className="border-b bg-green-50/30">
                          <td className="p-2 text-muted-foreground">{row.rowNumber}</td>
                          <td className="p-2 font-medium">{row.full_name}</td>
                          <td className="p-2">{row.email || '-'}</td>
                          <td className="p-2">{formatPhoneNumber(row.phone) || '-'}</td>
                          <td className="p-2">{row.account_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Phone Updates */}
            {previewData.filter(p => p.category === 'phone_update').length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 p-4 border-b border-blue-200">
                  <h3 className="font-semibold flex items-center gap-2 text-blue-800">
                    <RefreshCw className="h-4 w-4" />
                    Phone Number Updates ({previewData.filter(p => p.category === 'phone_update').length})
                  </h3>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Row</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Old Phone</th>
                        <th className="p-2 text-left">New Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.filter(p => p.category === 'phone_update').map((row, index) => (
                        <tr key={index} className="border-b bg-blue-50/30">
                          <td className="p-2 text-muted-foreground">{row.rowNumber}</td>
                          <td className="p-2 font-medium">{row.full_name}</td>
                          <td className="p-2">{row.email}</td>
                          <td className="p-2 text-muted-foreground line-through">
                            {formatPhoneNumber(row.existingPhone) || '-'}
                          </td>
                          <td className="p-2 font-semibold text-blue-600">
                            {formatPhoneNumber(row.phone)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rejected */}
            {previewData.filter(p => p.category === 'rejected').length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-200 flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    Rejected ({previewData.filter(p => p.category === 'rejected').length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rejected = previewData.filter(p => p.category === 'rejected');
                      const headers = ['row', 'full_name', 'email', 'phone', 'reason'];
                      const rows = rejected.map(r => {
                        const rowErrors = errors.filter(e => e.row === r.rowNumber);
                        const reason = rowErrors.map(e => `${e.field}: ${e.message}`).join('; ');
                        return [r.rowNumber, r.full_name, r.email, r.phone, reason];
                      });
                      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `rejected_profiles_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Rejected
                  </Button>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Row</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.filter(p => p.category === 'rejected').map((row, index) => {
                        const rowErrors = errors.filter(e => e.row === row.rowNumber);
                        return (
                          <tr key={index} className="border-b bg-red-50/30">
                            <td className="p-2 text-muted-foreground">{row.rowNumber}</td>
                            <td className="p-2 font-medium">{row.full_name}</td>
                            <td className="p-2">{row.email || '-'}</td>
                            <td className="p-2">{formatPhoneNumber(row.phone) || '-'}</td>
                            <td className="p-2 text-red-600 text-xs">
                              {rowErrors.map(e => e.message).join('; ')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            {errors.length > 0 && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Found {errors.length} validation errors. Please fix these before importing.
                  </AlertDescription>
                </Alert>
                
                <div className="max-h-96 overflow-auto space-y-2">
                  {errors.map((error, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-red-800">
                          Row {error.row}, Field: {error.field}
                        </div>
                        <div className="text-red-600">{error.message}</div>
                        {error.value && (
                          <div className="text-sm text-red-500">Value: "{error.value}"</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedProfileImporter;
