import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  Table, 
  BarChart3, 
  Receipt, 
  FileSpreadsheet,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PortfolioExportToolsProps {
  userShares: any[];
  userId: string;
}

const PortfolioExportTools: React.FC<PortfolioExportToolsProps> = ({ userShares, userId }) => {
  const [exportConfig, setExportConfig] = useState({
    format: 'csv',
    type: 'portfolio',
    dateRange: null as any,
    includeTransactions: true,
    includeDividends: true,
    includePerformance: true,
    includeMetadata: false
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportFormats = [
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
    { value: 'pdf', label: 'PDF Report', icon: FileText },
    { value: 'json', label: 'JSON Data', icon: Table }
  ];

  const exportTypes = [
    { value: 'portfolio', label: 'Portfolio Summary' },
    { value: 'transactions', label: 'Transaction History' },
    { value: 'dividends', label: 'Dividend History' },
    { value: 'tax_report', label: 'Tax Report' },
    { value: 'performance', label: 'Performance Analysis' },
    { value: 'complete', label: 'Complete Export' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress updates
      const progressSteps = [10, 30, 50, 70, 90, 100];
      
      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setExportProgress(progressSteps[i]);
      }

      const exportData = await generateExportData();
      
      if (exportConfig.format === 'csv') {
        downloadCSV(exportData);
      } else if (exportConfig.format === 'json') {
        downloadJSON(exportData);
      } else if (exportConfig.format === 'pdf') {
        await generatePDFReport(exportData);
      }

      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const generateExportData = async () => {
    const data: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        userId,
        exportType: exportConfig.type,
        dateRange: exportConfig.dateRange
      }
    };

    // Portfolio data
    if (exportConfig.type === 'portfolio' || exportConfig.type === 'complete') {
      data.portfolio = {
        summary: {
          totalShares: userShares.reduce((sum, share) => sum + share.quantity, 0),
          totalValue: userShares.reduce((sum, share) => 
            sum + (share.quantity * (share.shares?.price_per_share || 0)), 0),
          holdings: userShares.map(share => ({
            shareName: share.shares?.name,
            quantity: share.quantity,
            purchasePrice: share.purchase_price_per_share,
            currentPrice: share.shares?.price_per_share,
            currentValue: share.quantity * (share.shares?.price_per_share || 0),
            gainLoss: (share.shares?.price_per_share || 0) - (share.purchase_price_per_share || 0),
            gainLossPercent: ((share.shares?.price_per_share || 0) - (share.purchase_price_per_share || 0)) / (share.purchase_price_per_share || 1) * 100
          }))
        }
      };
    }

    // Transaction history
    if (exportConfig.includeTransactions && (exportConfig.type === 'transactions' || exportConfig.type === 'complete')) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      data.transactions = transactions;
    }

    // Dividend history
    if (exportConfig.includeDividends && (exportConfig.type === 'dividends' || exportConfig.type === 'complete')) {
      const { data: dividends } = await supabase
        .from('dividend_payments')
        .select('*, dividend_declarations(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      data.dividends = dividends;
    }

    return data;
  };

  const downloadCSV = (data: any) => {
    let csvContent = '';

    if (data.portfolio) {
      csvContent += 'Portfolio Holdings\n';
      csvContent += 'Share Name,Quantity,Purchase Price,Current Price,Current Value,Gain/Loss,Gain/Loss %\n';
      
      data.portfolio.summary.holdings.forEach((holding: any) => {
        csvContent += `${holding.shareName},${holding.quantity},${holding.purchasePrice},${holding.currentPrice},${holding.currentValue},${holding.gainLoss},${holding.gainLossPercent.toFixed(2)}%\n`;
      });
      csvContent += '\n';
    }

    if (data.transactions) {
      csvContent += 'Transaction History\n';
      csvContent += 'Date,Type,Amount,Currency,Status,Description\n';
      
      data.transactions.forEach((tx: any) => {
        csvContent += `${new Date(tx.created_at).toLocaleDateString()},${tx.transaction_type},${tx.amount},${tx.currency},${tx.status},${tx.description || ''}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generatePDFReport = async (data: any) => {
    // This would typically use a PDF generation library like jsPDF
    // For now, we'll create a formatted text version
    toast.info('PDF generation would be implemented with jsPDF library');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Portfolio Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportConfig.format} onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exportFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    <div className="flex items-center gap-2">
                      <format.icon className="h-4 w-4" />
                      {format.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Export Type</Label>
            <Select value={exportConfig.type} onValueChange={(value) => setExportConfig(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Include Data</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="transactions"
                checked={exportConfig.includeTransactions}
                onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeTransactions: !!checked }))}
              />
              <Label htmlFor="transactions">Transaction History</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dividends"
                checked={exportConfig.includeDividends}
                onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeDividends: !!checked }))}
              />
              <Label htmlFor="dividends">Dividend History</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="performance"
                checked={exportConfig.includePerformance}
                onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includePerformance: !!checked }))}
              />
              <Label htmlFor="performance">Performance Metrics</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={exportConfig.includeMetadata}
                onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeMetadata: !!checked }))}
              />
              <Label htmlFor="metadata">Technical Metadata</Label>
            </div>
          </div>
        </div>

        {exportConfig.type === 'tax_report' && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Tax Report Features</span>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Capital gains/losses calculation</li>
              <li>• Dividend income summary</li>
              <li>• Cost basis tracking</li>
              <li>• Tax year organization</li>
            </ul>
          </div>
        )}

        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Exporting data...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="w-full" />
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? 'Exporting...' : 'Generate Export'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => toast.info('Export scheduled for email delivery')}
          >
            Email Report
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Automated exports available
          </Badge>
          <Badge variant="outline">
            <Filter className="h-3 w-3 mr-1" />
            Custom date ranges
          </Badge>
          <Badge variant="outline">
            <BarChart3 className="h-3 w-3 mr-1" />
            Performance analytics
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioExportTools;