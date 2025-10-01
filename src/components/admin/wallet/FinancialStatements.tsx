import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, DollarSign, TrendingUp } from 'lucide-react';

interface FinancialStatement {
  assets: {
    adminFund: number;
    projectFunding: number;
    buybackFund: number;
    total: number;
  };
  revenue: {
    transactionFees: number;
    shareSales: number;
    total: number;
  };
  expenses: {
    adminExpenses: number;
    operational: number;
    total: number;
  };
  netIncome: number;
}

const FinancialStatements = () => {
  const [statement, setStatement] = useState<FinancialStatement>({
    assets: { adminFund: 0, projectFunding: 0, buybackFund: 0, total: 0 },
    revenue: { transactionFees: 0, shareSales: 0, total: 0 },
    expenses: { adminExpenses: 0, operational: 0, total: 0 },
    netIncome: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    loadFinancialData();
  }, [timeframe]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Get current wallet balances (Balance Sheet)
      const { data: wallets, error: walletsError } = await supabase
        .from('admin_sub_wallets')
        .select('*')
        .eq('is_active', true);

      if (walletsError) throw walletsError;

      // Calculate date range for P&L
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Get transaction fees (Revenue)
      const { data: feeTransactions, error: feesError } = await supabase
        .from('transactions')
        .select('fee_amount, currency')
        .gte('created_at', startDate.toISOString())
        .not('fee_amount', 'is', null);

      if (feesError) throw feesError;

      // Get share purchase revenue
      const { data: shareTransactions, error: sharesError } = await supabase
        .from('transactions')
        .select('amount, currency')
        .gte('created_at', startDate.toISOString())
        .eq('transaction_type', 'share_purchase')
        .in('status', ['completed', 'approved']);

      if (sharesError) throw sharesError;

      // Get admin expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('admin_expenses')
        .select('amount, currency')
        .eq('status', 'approved')
        .gte('processed_at', startDate.toISOString());

      if (expensesError) throw expensesError;

      // Calculate assets (current balances)
      const assets = {
        adminFund: wallets?.find(w => w.wallet_type === 'admin_fund')?.balance || 0,
        projectFunding: wallets?.find(w => w.wallet_type === 'project_funding')?.balance || 0,
        buybackFund: wallets?.find(w => w.wallet_type === 'share_buyback')?.balance || 0,
        total: 0
      };
      assets.total = assets.adminFund + assets.projectFunding + assets.buybackFund;

      // Calculate revenue from fees
      const transactionFees = feeTransactions?.reduce((sum, fee) => {
        const amount = fee.currency === 'USD' ? Number(fee.fee_amount || 0) * 3700 : Number(fee.fee_amount || 0);
        return sum + amount;
      }, 0) || 0;
      
      // Calculate revenue from share sales 
      const shareSales = shareTransactions?.reduce((sum, transaction) => {
        const amount = transaction.currency === 'USD' ? Math.abs(transaction.amount) * 3700 : Math.abs(transaction.amount);
        return sum + amount;
      }, 0) || 0;

      // Calculate total expenses
      const adminExpenses = expenses?.reduce((sum, expense) => {
        const amount = expense.currency === 'USD' ? expense.amount * 3700 : expense.amount;
        return sum + amount;
      }, 0) || 0;

      const revenue = {
        transactionFees,
        shareSales,
        total: transactionFees + shareSales
      };

      const expenseData = {
        adminExpenses,
        operational: 0,
        total: adminExpenses
      };

      const netIncome = revenue.total - expenseData.total;

      setStatement({
        assets,
        revenue,
        expenses: expenseData,
        netIncome
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportStatement = () => {
    const statementData = [
      ['BALANCE SHEET'],
      ['Assets'],
      ['Admin Fund', statement.assets.adminFund.toLocaleString()],
      ['Project Funding', statement.assets.projectFunding.toLocaleString()],
      ['Buyback Fund', statement.assets.buybackFund.toLocaleString()],
      ['Total Assets', statement.assets.total.toLocaleString()],
      [''],
      ['PROFIT & LOSS'],
      ['Revenue'],
      ['Transaction Fees', statement.revenue.transactionFees.toLocaleString()],
      ['Share Sales', statement.revenue.shareSales.toLocaleString()],
      ['Total Revenue', statement.revenue.total.toLocaleString()],
      [''],
      ['Expenses'],
      ['Admin Expenses', statement.expenses.adminExpenses.toLocaleString()],
      ['Total Expenses', statement.expenses.total.toLocaleString()],
      [''],
      ['Net Income', statement.netIncome.toLocaleString()]
    ];

    const csvContent = statementData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `financial-statement-${timeframe}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Financial Statements</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Financial Statements
        </h2>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportStatement} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Balance Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admin Fund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statement.assets.adminFund.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">UGX</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Project Funding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statement.assets.projectFunding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">UGX</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Buyback Fund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statement.assets.buybackFund.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">UGX</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statement.assets.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">UGX</p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue ({timeframe})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Transaction Fees</span>
              <span className="font-medium">{statement.revenue.transactionFees.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Share Sales</span>
              <span className="font-medium">{statement.revenue.shareSales.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Revenue</span>
              <span className="text-green-600">{statement.revenue.total.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              Expenses ({timeframe})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Admin Expenses</span>
              <span className="font-medium">{statement.expenses.adminExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Operational</span>
              <span className="font-medium">{statement.expenses.operational.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Expenses</span>
              <span className="text-red-600">{statement.expenses.total.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Income */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Net Income ({timeframe})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold text-center ${statement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {statement.netIncome.toLocaleString()} UGX
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Revenue minus Expenses
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialStatements;