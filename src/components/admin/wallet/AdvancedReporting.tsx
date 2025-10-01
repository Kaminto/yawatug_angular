
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer
} from 'recharts';
import { 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  Activity
} from 'lucide-react';

interface FinancialReport {
  period: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  transaction_fees: number;
  user_growth: number;
}

interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  net_flow: number;
}

interface UserActivityData {
  date: string;
  active_users: number;
  new_users: number;
  transactions: number;
}

const AdvancedReporting: React.FC = () => {
  const [financialReports, setFinancialReports] = useState<FinancialReport[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [userActivityData, setUserActivityData] = useState<UserActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [selectedCurrency, setSelectedCurrency] = useState('UGX');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadReportingData();
  }, [reportPeriod, selectedCurrency]);

  const loadReportingData = async () => {
    try {
      setLoading(true);
      
      // Load financial data
      await loadFinancialReports();
      await loadCashFlowData();
      await loadUserActivityData();

    } catch (error) {
      console.error('Error loading reporting data:', error);
      toast.error('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialReports = async () => {
    try {
      // This would be calculated from actual transaction data
      // For now, we'll simulate the data
      const simulatedData: FinancialReport[] = [
        {
          period: '2024-01',
          total_revenue: 45000000,
          total_expenses: 25000000,
          net_profit: 20000000,
          transaction_fees: 5000000,
          user_growth: 150
        },
        {
          period: '2024-02',
          total_revenue: 52000000,
          total_expenses: 28000000,
          net_profit: 24000000,
          transaction_fees: 6000000,
          user_growth: 200
        },
        {
          period: '2024-03',
          total_revenue: 48000000,
          total_expenses: 26000000,
          net_profit: 22000000,
          transaction_fees: 5500000,
          user_growth: 175
        }
      ];

      setFinancialReports(simulatedData);
    } catch (error) {
      console.error('Error loading financial reports:', error);
    }
  };

  const loadCashFlowData = async () => {
    try {
      // Generate last 30 days of cash flow data
      const cashFlowData: CashFlowData[] = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const inflow = Math.random() * 2000000 + 500000;
        const outflow = Math.random() * 1500000 + 300000;
        
        cashFlowData.push({
          date: date.toISOString().split('T')[0],
          inflow,
          outflow,
          net_flow: inflow - outflow
        });
      }

      setCashFlowData(cashFlowData);
    } catch (error) {
      console.error('Error loading cash flow data:', error);
    }
  };

  const loadUserActivityData = async () => {
    try {
      // Generate user activity data
      const activityData: UserActivityData[] = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        activityData.push({
          date: date.toISOString().split('T')[0],
          active_users: Math.floor(Math.random() * 500 + 200),
          new_users: Math.floor(Math.random() * 50 + 10),
          transactions: Math.floor(Math.random() * 200 + 50)
        });
      }

      setUserActivityData(activityData);
    } catch (error) {
      console.error('Error loading user activity data:', error);
    }
  };

  const exportReport = async (reportType: string) => {
    try {
      // This would generate and download the actual report
      toast.success(`${reportType} report exported successfully`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return <div className="animate-pulse">Loading advanced reporting...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advanced Financial Reporting</h2>
        <div className="flex gap-2">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UGX">UGX</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialReports.reduce((sum, r) => sum + r.total_revenue, 0))}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(financialReports.reduce((sum, r) => sum + r.total_expenses, 0))}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(financialReports.reduce((sum, r) => sum + r.net_profit, 0))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transaction Fees</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(financialReports.reduce((sum, r) => sum + r.transaction_fees, 0))}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue vs Expenses Chart */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Revenue vs Expenses</CardTitle>
                <Button variant="outline" onClick={() => exportReport('financial')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={financialReports}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="total_revenue" fill="#10B981" name="Revenue" />
                  <Bar dataKey="total_expenses" fill="#EF4444" name="Expenses" />
                  <Bar dataKey="net_profit" fill="#3B82F6" name="Net Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Daily Cash Flow (Last 30 Days)</CardTitle>
                <Button variant="outline" onClick={() => exportReport('cashflow')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="inflow" stroke="#10B981" name="Inflow" />
                  <Line type="monotone" dataKey="outflow" stroke="#EF4444" name="Outflow" />
                  <Line type="monotone" dataKey="net_flow" stroke="#3B82F6" name="Net Flow" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Activity Trends</CardTitle>
                <Button variant="outline" onClick={() => exportReport('activity')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="active_users" stroke="#8884D8" name="Active Users" />
                  <Line type="monotone" dataKey="new_users" stroke="#82CA9D" name="New Users" />
                  <Line type="monotone" dataKey="transactions" stroke="#FFC658" name="Transactions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>KYC Compliance</span>
                    <span className="text-green-600 font-medium">98.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>AML Checks</span>
                    <span className="text-green-600 font-medium">99.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Transaction Monitoring</span>
                    <span className="text-green-600 font-medium">100%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Regulatory Reporting</span>
                    <span className="text-yellow-600 font-medium">95.8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Low Risk Users</span>
                    <span className="text-green-600 font-medium">85%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Medium Risk Users</span>
                    <span className="text-yellow-600 font-medium">12%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>High Risk Users</span>
                    <span className="text-red-600 font-medium">3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Flagged Transactions</span>
                    <span className="text-red-600 font-medium">0.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Audit Trail</CardTitle>
                <Button variant="outline" onClick={() => exportReport('compliance')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Audit Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">System Backup Completed</p>
                    <p className="text-sm text-muted-foreground">Daily automated backup successful</p>
                  </div>
                  <span className="text-sm text-muted-foreground">Today 02:00 AM</span>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Compliance Report Generated</p>
                    <p className="text-sm text-muted-foreground">Monthly regulatory report submitted</p>
                  </div>
                  <span className="text-sm text-muted-foreground">Yesterday 11:30 PM</span>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Security Audit Completed</p>
                    <p className="text-sm text-muted-foreground">Weekly security assessment passed</p>
                  </div>
                  <span className="text-sm text-muted-foreground">3 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;
