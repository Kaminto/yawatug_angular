
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Receipt, DollarSign, Calendar } from 'lucide-react';
import { AdminExpense, AdminExpenseCategory } from '@/types/custom';

const AdminExpenseManager = () => {
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [categories, setCategories] = useState<AdminExpenseCategory[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('UGX');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');

  // Default expense categories
  const defaultCategories = [
    { name: 'Salaries and Wages', description: 'Employee compensation and benefits' },
    { name: 'Office Rent', description: 'Monthly office rental payments' },
    { name: 'Utilities', description: 'Power, water, internet, and other utilities' },
    { name: 'Meals and Entertainment', description: 'Business meals and entertainment expenses' },
    { name: 'Marketing and Advertising', description: 'Promotional and marketing expenses' },
    { name: 'Office Supplies', description: 'Stationery, equipment, and office materials' },
    { name: 'Travel and Transport', description: 'Business travel and transportation costs' },
    { name: 'Professional Services', description: 'Legal, accounting, and consulting fees' },
    { name: 'Insurance', description: 'Business insurance premiums' },
    { name: 'Maintenance and Repairs', description: 'Equipment and facility maintenance' },
    { name: 'Communication', description: 'Phone, internet, and communication services' },
    { name: 'Training and Development', description: 'Employee training and development costs' },
    { name: 'Taxes and Licenses', description: 'Business taxes and license fees' },
    { name: 'Miscellaneous', description: 'Other administrative expenses' }
  ];

  useEffect(() => {
    initializeExpenseSystem();
  }, []);

  const initializeExpenseSystem = async () => {
    try {
      // Create expense categories table if it doesn't exist
      await initializeExpenseCategories();
      
      // Load expenses and categories
      await Promise.all([
        loadExpenses(),
        loadCategories()
      ]);
    } catch (error) {
      console.error('Error initializing expense system:', error);
      toast.error('Failed to initialize expense system');
    } finally {
      setLoading(false);
    }
  };

  const initializeExpenseCategories = async () => {
    try {
      // Since admin_expense_categories might not be in generated types yet, 
      // we'll use the default categories for now
      const mockCategories = defaultCategories.map((cat, index) => ({
        id: `cat-${index + 1}`,
        name: cat.name,
        description: cat.description,
        is_active: true
      }));
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_expenses')
        .select('*')
        .order('processed_at', { ascending: false });

      if (error) throw error;
      setExpenses((data || []).map(expense => ({
        ...expense,
        status: expense.status as 'pending' | 'approved' | 'rejected'
      })));
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    }
  };

  const loadCategories = async () => {
    try {
      // Using default categories since table might not be in generated types yet
      const mockCategories = defaultCategories.map((cat, index) => ({
        id: `cat-${index + 1}`,
        name: cat.name,
        description: cat.description,
        is_active: true
      }));
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load expense categories');
    }
  };

  const handleAddExpense = async () => {
    if (!selectedCategory || !amount || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const expenseAmount = parseFloat(amount);
      
      // Check admin fund balance
      const { data: adminFund } = await supabase
        .from('admin_sub_wallets')
        .select('balance')
        .eq('wallet_type', 'admin_fund')
        .eq('currency', currency)
        .single();

      if (!adminFund || adminFund.balance < expenseAmount) {
        toast.error('Insufficient balance in admin fund');
        return;
      }

      // Create the expense record
      const { error: expenseError } = await supabase
        .from('admin_expenses')
        .insert({
          category_id: selectedCategory,
          category_name: categories.find(c => c.id === selectedCategory)?.name || 'Unknown',
          amount: expenseAmount,
          currency,
          description,
          reference: reference || null,
          processed_by: user.id,
          status: 'approved'
        });

      if (expenseError) throw expenseError;

      // Deduct from admin fund
      const { error: deductError } = await supabase
        .from('admin_sub_wallets')
        .update({ 
          balance: adminFund.balance - expenseAmount,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_type', 'admin_fund')
        .eq('currency', currency);

      if (deductError) throw deductError;

      // Record the transaction
      await supabase
        .from('admin_wallet_fund_transfers')
        .insert({
          from_wallet_id: null, // Will be populated by admin fund ID
          amount: expenseAmount,
          currency,
          transfer_type: 'expense',
          description: `Admin expense: ${description}`,
          reference: reference || null,
          created_by: user.id
        });

      toast.success('Expense recorded successfully');
      setShowAddExpense(false);
      resetForm();
      loadExpenses();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setAmount('');
    setCurrency('UGX');
    setDescription('');
    setReference('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      approved: { color: 'bg-green-500', text: 'Approved' },
      rejected: { color: 'bg-red-500', text: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse">Loading expense manager...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Admin Expense Manager</h3>
        <Button onClick={() => setShowAddExpense(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Today's Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {expenses
                .filter(e => new Date(e.processed_at).toDateString() === new Date().toDateString())
                .reduce((sum, e) => sum + e.amount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {expenses
                .filter(e => new Date(e.processed_at).getMonth() === new Date().getMonth())
                .reduce((sum, e) => sum + e.amount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {new Date(expense.processed_at).toLocaleDateString()}
                  </TableCell>
                   <TableCell>
                     {categories.find(c => c.id === expense.category_id)?.name || 'Unknown'}
                   </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    {expense.currency} {expense.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>{expense.reference || '-'}</TableCell>
                  <TableCell>{getStatusBadge(expense.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UGX">UGX</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter expense description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Label>Reference (Optional)</Label>
              <Input
                placeholder="Enter reference number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpense(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={submitting}>
              {submitting ? 'Processing...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpenseManager;
