
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
import { Download, Upload, AlertCircle, CheckCircle, Eye, FileText, Users } from 'lucide-react';

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

  const normalizePhone = (phone: string): string => {
    console.log('Normalizing phone:', phone);
    
    // Handle scientific notation (e.g., 2.567E+11 from Excel)
    let cleaned = phone.trim();
    if (cleaned.includes('E') || cleaned.includes('e')) {
      const number = parseFloat(cleaned);
      if (!isNaN(number)) {
        cleaned = number.toString();
        console.log('Converted from scientific notation:', phone, '→', cleaned);
      }
    }
    
    // Remove all spaces, dashes, and parentheses
    cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
    console.log('After cleaning:', cleaned);
    
    // Convert +256 to 0 (Uganda country code)
    if (cleaned.startsWith('+256')) {
      cleaned = '0' + cleaned.substring(4);
    } else if (cleaned.startsWith('256')) {
      cleaned = '0' + cleaned.substring(3);
    }
    
    console.log('Final normalized phone:', cleaned);
    return cleaned;
  };

  const validatePhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    const phoneRegex = /^0\d{9}$/; // Uganda phone format: 0 followed by 9 digits
    const isValid = phoneRegex.test(normalized);
    console.log('Validating phone:', phone, '-> normalized:', normalized, '-> valid:', isValid);
    return isValid;
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
          message: `Invalid phone format. Original: ${originalPhone}, Normalized: ${normalizedPhone}`, 
          value: originalPhone 
        });
      } else {
        console.log('✅ Phone valid');
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

      const headers = lines[0].split(',').map(h => h.trim());
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

      // Check for existing emails to detect duplicates
      const emails = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const emailIndex = headers.indexOf('email');
        return values[emailIndex];
      }).filter(Boolean);

      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('email')
        .in('email', emails);

      const existingEmails = new Set(existingProfiles?.map(p => p.email) || []);
      const duplicateEmails = new Set<string>();
      const seenEmails = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) {
          console.log(`⚠️ Row ${i + 1} has insufficient columns:`, values.length, 'vs', headers.length);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        console.log(`Processing row ${i + 1}:`, rowData);

        // Check for duplicates within the file
        if (seenEmails.has(rowData.email)) {
          duplicateEmails.add(rowData.email);
          allErrors.push({ 
            row: i + 1, 
            field: 'email', 
            message: 'Duplicate email in file', 
            value: rowData.email 
          });
        } else {
          seenEmails.add(rowData.email);
        }

        // Check for existing emails in database
        if (existingEmails.has(rowData.email)) {
          allErrors.push({ 
            row: i + 1, 
            field: 'email', 
            message: 'Email already exists in database', 
            value: rowData.email 
          });
        }

        const rowErrors = validateRow(rowData, i - 1);
        allErrors.push(...rowErrors);

        parsedData.push({
          full_name: rowData.full_name || '',
          email: rowData.email || '',
          phone: rowData.phone || '',
          user_type: rowData.user_type || 'individual',
          nationality: rowData.nationality || '',
          country_of_residence: rowData.country_of_residence || '',
          town_city: rowData.town_city || '',
          date_of_birth: rowData.date_of_birth || '',
          gender: rowData.gender || '',
          tin: rowData.tin || '',
          account_type: rowData.account_type || rowData.user_type || 'individual'
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
        
        // Skip records with missing critical fields only
        const hasEmail = profile.email?.trim();
        const hasPhone = profile.phone?.trim();
        
        if (!profile.full_name?.trim() || (!hasEmail && !hasPhone)) {
          rejectedRecords.push({ 
            data: profile, 
            errors: [{ row: i + 2, field: 'required', message: 'Missing name or contact method (email/phone)' }] 
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

            {parsing && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Parsing CSV file and validating data...
                </AlertDescription>
              </Alert>
            )}

            {showPreview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.total - errors.length}</div>
                    <div className="text-sm text-muted-foreground">Valid Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{errors.length}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
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
              disabled={!showPreview || importing}
              className="w-full flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importing...' : `Import Valid Records (${previewData.length - errors.length}/${previewData.length})`}
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
            {previewData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-4 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Data Preview ({previewData.length} records)
                  </h3>
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Country</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 50).map((row, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{row.full_name}</td>
                          <td className="p-2">{row.email}</td>
                          <td className="p-2">{row.phone}</td>
                          <td className="p-2">{row.user_type}</td>
                          <td className="p-2">{row.country_of_residence}</td>
                          <td className="p-2">
                            {errors.some(e => e.row === index + 2) ? (
                              <Badge variant="destructive">Has Errors</Badge>
                            ) : (
                              <Badge variant="secondary">Valid</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 50 && (
                    <div className="p-4 text-center text-muted-foreground">
                      ... and {previewData.length - 50} more records
                    </div>
                  )}
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
