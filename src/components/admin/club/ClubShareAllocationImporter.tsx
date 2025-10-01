import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ClubAllocationImportData } from '@/interfaces/ClubShareInterfaces';

interface ClubShareAllocationImporterProps {
  onImportComplete: () => void;
}

const ClubShareAllocationImporter: React.FC<ClubShareAllocationImporterProps> = ({
  onImportComplete
}) => {
  const [importData, setImportData] = useState<ClubAllocationImportData[]>([]);
  const [batchReference, setBatchReference] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      parseCSVData(csv);
    };
    reader.readAsText(file);
  };

  // Helper function to clean and parse numbers with separators
  const cleanAndParseNumber = (value: string, isInteger = false): number => {
    if (!value || value.trim() === '') return 0;
    
    // Remove commas, spaces, and other common thousands separators
    const cleaned = value.toString().replace(/[,\s]/g, '');
    
    if (isInteger) {
      const parsed = parseInt(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
  };

  const parseCSVData = (csv: string) => {
    const lines = csv.split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const expectedHeaders = ['member_name', 'email', 'phone', 'allocated_shares', 'transfer_fee_paid', 'debt_amount_settled', 'total_cost', 'cost_per_share', 'debt_rejected'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }

    const data: ClubAllocationImportData[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      
      try {
        const rowData: ClubAllocationImportData = {
          member_name: values[headers.indexOf('member_name')] || '',
          email: values[headers.indexOf('email')] || undefined,
          phone: values[headers.indexOf('phone')] || undefined,
          allocated_shares: cleanAndParseNumber(values[headers.indexOf('allocated_shares')], true),
          transfer_fee_paid: cleanAndParseNumber(values[headers.indexOf('transfer_fee_paid')]),
          debt_amount_settled: cleanAndParseNumber(values[headers.indexOf('debt_amount_settled')]),
          total_cost: cleanAndParseNumber(values[headers.indexOf('total_cost')]),
          cost_per_share: cleanAndParseNumber(values[headers.indexOf('cost_per_share')]),
          debt_rejected: cleanAndParseNumber(values[headers.indexOf('debt_rejected')]),
        };

        // Validation
        if (!rowData.member_name) {
          errors.push(`Row ${i + 1}: Member name is required`);
        }
        if (rowData.allocated_shares <= 0) {
          errors.push(`Row ${i + 1}: Allocated shares must be positive`);
        }
        if (rowData.transfer_fee_paid < 0) {
          errors.push(`Row ${i + 1}: Transfer fee cannot be negative`);
        }
        if (rowData.debt_amount_settled < 0) {
          errors.push(`Row ${i + 1}: Debt amount cannot be negative`);
        }
        if (rowData.total_cost <= 0) {
          errors.push(`Row ${i + 1}: Total cost must be positive`);
        }
        if (rowData.cost_per_share <= 0) {
          errors.push(`Row ${i + 1}: Cost per share must be positive`);
        }
        if ((rowData.debt_rejected || 0) < 0) {
          errors.push(`Row ${i + 1}: Debt rejected cannot be negative`);
        }

        data.push(rowData);
      } catch (error) {
        errors.push(`Row ${i + 1}: Invalid data format`);
      }
    }

    setImportData(data);
    setValidationErrors(errors);
    setPreviewMode(true);
    
    if (errors.length === 0) {
      toast.success(`${data.length} records loaded successfully`);
    } else {
      toast.warning(`${data.length} records loaded with ${errors.length} validation errors`);
    }
  };

  const downloadTemplate = () => {
    const headers = ['member_name', 'email', 'phone', 'allocated_shares', 'transfer_fee_paid', 'debt_amount_settled', 'total_cost', 'cost_per_share', 'debt_rejected'];
    const sampleData = [
      'John Doe,john@example.com,+256701234567,1000,50000,500000,1000000,1000,25000',
      'Jane Smith,jane@example.com,+256702345678,500,25000,250000,500000,1000,10000'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'club_allocation_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const processImport = async () => {
    if (!batchReference.trim()) {
      toast.error('Please provide a batch reference');
      return;
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    setProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const batchRef = `CLUB-${Date.now()}-${batchReference.trim()}`;

      for (const item of importData) {
        try {
          // Find or create club member
          let clubMember;
          const { data: existingMember } = await supabase
            .from('investment_club_members')
            .select('id')
            .eq('member_name', item.member_name)
            .maybeSingle();

          if (existingMember) {
            clubMember = existingMember;
          } else {
            // Create new club member
            const { data: newMember, error: memberError } = await supabase
              .from('investment_club_members')
              .insert({
                member_name: item.member_name,
                email: item.email,
                phone: item.phone,
                member_code: `CLUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              })
              .select('id')
              .single();

            if (memberError) throw memberError;
            clubMember = newMember;
          }

          // Create allocation record
          const { data: allocationData, error: allocationError } = await supabase
            .from('club_share_allocations')
            .insert({
              club_member_id: clubMember.id,
              allocated_shares: item.allocated_shares,
              transfer_fee_paid: item.transfer_fee_paid,
              debt_amount_settled: item.debt_amount_settled,
              total_cost: item.total_cost,
              cost_per_share: item.cost_per_share,
              debt_rejected: item.debt_rejected || 0,
              import_batch_reference: batchRef,
              allocation_status: 'pending_invitation'
            })
            .select('id')
            .single();

          if (allocationError) throw allocationError;

          // Create holding account with the correct allocation ID
          const { error: holdingError } = await supabase
            .from('club_share_holding_account')
            .insert({
              club_member_id: clubMember.id,
              club_allocation_id: allocationData.id, // Use the actual allocation ID
              shares_quantity: item.allocated_shares,
              status: 'holding'
            });

          if (holdingError) throw holdingError;

          successCount++;
        } catch (error) {
          console.error(`Error processing ${item.member_name}:`, error);
          errorCount++;
        }
      }

      toast.success(`Import completed: ${successCount} successful, ${errorCount} errors`);
      setImportData([]);
      setPreviewMode(false);
      setBatchReference('');
      onImportComplete();

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to process import');
    } finally {
      setProcessing(false);
    }
  };

  const clearPreview = () => {
    setImportData([]);
    setPreviewMode(false);
    setValidationErrors([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Club Share Allocation Importer
        </CardTitle>
        <CardDescription>
          Import club member debt-to-share conversion allocations from CSV file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!previewMode ? (
          <>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="file-upload">Upload CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            <div>
              <Label htmlFor="batch-reference">Batch Reference</Label>
              <Input
                id="batch-reference"
                value={batchReference}
                onChange={(e) => setBatchReference(e.target.value)}
                placeholder="e.g., Settlement-2024-Q1"
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Import Preview</h3>
                <p className="text-sm text-muted-foreground">
                  {importData.length} records ready for import
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearPreview}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button 
                  onClick={processImport} 
                  disabled={processing || validationErrors.length > 0}
                >
                  {processing ? 'Processing...' : 'Import Data'}
                </Button>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h4 className="font-medium text-destructive">Validation Errors</h4>
                </div>
                <ul className="text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-destructive">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Transfer Fee</TableHead>
                    <TableHead>Debt Settled</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Cost/Share</TableHead>
                    <TableHead>Debt Rejected</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.member_name}</TableCell>
                      <TableCell>{item.email || '-'}</TableCell>
                      <TableCell>{item.phone || '-'}</TableCell>
                      <TableCell>{item.allocated_shares.toLocaleString()}</TableCell>
                      <TableCell>UGX {item.transfer_fee_paid.toLocaleString()}</TableCell>
                      <TableCell>UGX {item.debt_amount_settled.toLocaleString()}</TableCell>
                      <TableCell>UGX {item.total_cost.toLocaleString()}</TableCell>
                      <TableCell>UGX {item.cost_per_share.toLocaleString()}</TableCell>
                      <TableCell>UGX {(item.debt_rejected || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubShareAllocationImporter;